-- =============================================================================
-- Veredoc — Notification outbox (email transazionali dell'analisi)
-- File: supabase/migrations/003_notification_outbox.sql
--
-- Migrazione additiva: crea due enum, una tabella e un indice parziale su "Document".
-- Non modifica né riempie righe esistenti (nessun backfill: le notifiche nascono solo
-- da transizioni avvenute dopo l'attivazione di NOTIFICATIONS_ENABLED).
--
-- Ordine di attivazione:
--   1. eseguire questo file nel Supabase SQL Editor (idempotente);
--   2. solo dopo, impostare NOTIFICATIONS_ENABLED=true su Vercel e ridistribuire.
-- Con NOTIFICATIONS_ENABLED assente/false l'applicazione non legge né scrive la tabella.
--
-- Rollback:
--   1. impostare NOTIFICATIONS_ENABLED=false (o rimuoverla) e ridistribuire;
--   2. DROP TABLE IF EXISTS "NotificationOutbox";
--      DROP TYPE IF EXISTS "NotificationStatus";
--      DROP TYPE IF EXISTS "NotificationEventType";
--      DROP INDEX IF EXISTS "Document_analysis_in_flight_idx";
-- =============================================================================

DO $$ BEGIN
  CREATE TYPE "NotificationEventType" AS ENUM (
    'ANALYSIS_DELAYED',
    'ANALYSIS_COMPLETED',
    'ANALYSIS_FAILED'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "NotificationStatus" AS ENUM (
    'PENDING',
    'SENDING',
    'SENT',
    'FAILED',
    'CANCELLED'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- id: UUID v4, riusato come idempotencyKey Brevo per tutti i tentativi della riga.
-- eventKey: <evento>:<documentId>:<ciclo analisi>; il vincolo UNIQUE impedisce eventi logici duplicati.
-- Nessuna copia dell'indirizzo email: viene letto da "User" al momento dell'invio.
CREATE TABLE IF NOT EXISTS "NotificationOutbox" (
  "id"                TEXT                    NOT NULL,
  "userId"            TEXT                    NOT NULL,
  "documentId"        TEXT                    NOT NULL,
  "eventType"         "NotificationEventType" NOT NULL,
  "eventKey"          TEXT                    NOT NULL,
  "analysisCycle"     INTEGER                 NOT NULL,
  "status"            "NotificationStatus"    NOT NULL DEFAULT 'PENDING',
  "attempts"          INTEGER                 NOT NULL DEFAULT 0,
  "nextAttemptAt"     TIMESTAMPTZ             NOT NULL DEFAULT NOW(),
  "leaseId"           TEXT,
  "leaseExpiresAt"    TIMESTAMPTZ,
  "lastSendStartedAt" TIMESTAMPTZ,
  "ambiguousSince"    TIMESTAMPTZ,
  "sentAt"            TIMESTAMPTZ,
  "lastErrorCode"     TEXT,
  "providerMessageId" TEXT,
  "createdAt"         TIMESTAMPTZ             NOT NULL DEFAULT NOW(),
  "updatedAt"         TIMESTAMPTZ             NOT NULL DEFAULT NOW(),

  CONSTRAINT "NotificationOutbox_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "NotificationOutbox_eventKey_key" UNIQUE ("eventKey"),
  CONSTRAINT "NotificationOutbox_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "NotificationOutbox_documentId_fkey"
    FOREIGN KEY ("documentId") REFERENCES "Document"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

-- Dispatcher: righe dovute ordinate per nextAttemptAt (include lease SENDING scaduti).
CREATE INDEX IF NOT EXISTS "NotificationOutbox_status_nextAttemptAt_idx"
  ON "NotificationOutbox"("status", "nextAttemptAt");
CREATE INDEX IF NOT EXISTS "NotificationOutbox_documentId_idx"
  ON "NotificationOutbox"("documentId");
CREATE INDEX IF NOT EXISTS "NotificationOutbox_userId_idx"
  ON "NotificationOutbox"("userId");

-- Ricerca dei documenti in attesa prolungata e del job di recovery senza scansione completa.
CREATE INDEX IF NOT EXISTS "Document_analysis_in_flight_idx"
  ON "Document"("updatedAt")
  WHERE "status" IN ('PENDING', 'PROCESSING') AND "deletedAt" IS NULL;

-- Tabella solo server-side: nessuna policy, quindi i ruoli API Supabase non possono leggerla.
-- Prisma usa la connessione postgres (DATABASE_URL), che non è soggetta a RLS.
ALTER TABLE "NotificationOutbox" ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON TABLE "NotificationOutbox" FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON TABLE "NotificationOutbox" FROM authenticated;
  END IF;
END $$;
