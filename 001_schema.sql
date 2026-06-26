-- =============================================================================
-- Veredoc — Schema iniziale DB
-- File: supabase/migrations/001_schema.sql
--
-- Fonte di verità per lo schema Supabase.
-- Ogni modifica allo schema va applicata sia qui che in prisma/schema.prisma.
--
-- Esecuzione: incolla questo file nel Supabase SQL Editor e clicca "Run".
-- È idempotente: si può rieseguire senza errori grazie a IF NOT EXISTS.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- ENUM: DocumentType
-- Tipo di documento caricato dall'utente.
-- -----------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE "DocumentType" AS ENUM (
    'BOLLETTA_LUCE',
    'BOLLETTA_GAS',
    'BOLLETTA_INTERNET',
    'BUSTA_PAGA'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;


-- -----------------------------------------------------------------------------
-- ENUM: AnalysisStatus
-- Stato dell'analisi AI del documento.
-- -----------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE "AnalysisStatus" AS ENUM (
    'PENDING',
    'PROCESSING',
    'DONE',
    'ERROR'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;


-- -----------------------------------------------------------------------------
-- TABLE: User
-- Utenti registrati all'applicazione.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "User" (
  "id"        TEXT        NOT NULL,
  "email"     TEXT        NOT NULL,
  "password"  TEXT        NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT "User_pkey"  PRIMARY KEY ("id"),
  CONSTRAINT "User_email_key" UNIQUE ("email")
);


-- -----------------------------------------------------------------------------
-- TABLE: Document
-- Documenti caricati dagli utenti e il risultato dell'analisi AI.
-- rawExtracted: dati grezzi estratti da Claude.
-- analysis:     dati strutturati finali, include confronto mercato per bollette.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "Document" (
  "id"           TEXT             NOT NULL,
  "userId"       TEXT             NOT NULL,
  "type"         "DocumentType"   NOT NULL,
  "filePath"     TEXT             NOT NULL,
  "fileName"     TEXT             NOT NULL,
  "status"       "AnalysisStatus" NOT NULL DEFAULT 'PENDING',
  "rawExtracted" JSONB,
  "analysis"     JSONB,
  "createdAt"    TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
  "updatedAt"    TIMESTAMPTZ      NOT NULL DEFAULT NOW(),

  CONSTRAINT "Document_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Document_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

-- Trigger per aggiornare updatedAt automaticamente ad ogni UPDATE
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  CREATE TRIGGER "Document_updatedAt_trigger"
    BEFORE UPDATE ON "Document"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;


-- -----------------------------------------------------------------------------
-- TABLE: MarketRate
-- Tariffe di mercato scrapate ogni notte tramite n8n + ScraperAPI.
-- priceUnit: "€/kWh" | "€/Smc" | "€/mese"
-- @@unique([provider, planName]): permette upsert senza duplicati.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "MarketRate" (
  "id"         TEXT        NOT NULL,
  "category"   TEXT        NOT NULL,
  "provider"   TEXT        NOT NULL,
  "planName"   TEXT        NOT NULL,
  "priceValue" FLOAT8      NOT NULL,
  "priceUnit"  TEXT        NOT NULL,
  "url"        TEXT,
  "scrapedAt"  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT "MarketRate_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "MarketRate_provider_planName_key" UNIQUE ("provider", "planName")
);

-- -----------------------------------------------------------------------------
-- MIGRATION: Aggiunta campo plan a User
-- Eseguire su Supabase SQL Editor se la tabella User esiste già.
-- -----------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE "UserPlan" AS ENUM ('FREE', 'PRO');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "plan" "UserPlan" NOT NULL DEFAULT 'FREE';

-- -----------------------------------------------------------------------------
-- MIGRATION: Anonymizer preview — status e campi intermedi
-- Eseguire su Supabase SQL Editor
-- -----------------------------------------------------------------------------

-- Aggiunge AWAITING_CONFIRMATION all'enum AnalysisStatus
ALTER TYPE "AnalysisStatus" ADD VALUE IF NOT EXISTS 'AWAITING_CONFIRMATION';

-- Aggiunge campi per lo stato intermedio di anonimizzazione
ALTER TABLE "Document"
  ADD COLUMN IF NOT EXISTS "anonymizedText" TEXT,
  ADD COLUMN IF NOT EXISTS "anonymizedMap"  JSONB;

-- -----------------------------------------------------------------------------
-- MIGRATION: Soft delete documenti
-- Eseguire su Supabase SQL Editor
-- -----------------------------------------------------------------------------

ALTER TYPE "AnalysisStatus" ADD VALUE IF NOT EXISTS 'DELETED';

ALTER TABLE "Document"
  ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMPTZ;

-- filePath diventa nullable per i documenti eliminati
ALTER TABLE "Document"
  ALTER COLUMN "filePath" DROP NOT NULL;

-- -----------------------------------------------------------------------------
-- MIGRATION: Aggiunta monthlyFee a MarketRate
-- quota fissa mensile in € (CCV annuale / 12) — null se non disponibile
-- -----------------------------------------------------------------------------
ALTER TABLE "MarketRate"
  ADD COLUMN IF NOT EXISTS "monthlyFee" FLOAT;

-- -----------------------------------------------------------------------------
-- MIGRATION: Tracciamento correzione tipo documento
-- -----------------------------------------------------------------------------
ALTER TABLE "Document"
  ADD COLUMN IF NOT EXISTS "typeCorrected" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "typeSelectedByUser" TEXT;
