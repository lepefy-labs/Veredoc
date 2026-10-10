-- =============================================================================
-- Veredoc — Ciclo di vita account: verifica email, cambio email, sessioni
-- File: supabase/migrations/005_account_lifecycle.sql
--
-- Migrazione additiva: due tabelle nuove, nessuna modifica a tabelle esistenti,
-- nessun backfill. Idempotente.
--
-- Prima dell'applicazione:
-- - verifica e cambio email non disponibili (la UI lo indica);
-- - nessuna invalidazione delle altre sessioni dopo il cambio password;
-- - gli account esistenti (senza riga in AccountState) restano trattati come prima.
--
-- Rollback:
--   DROP TABLE IF EXISTS "EmailToken";
--   DROP TABLE IF EXISTS "AccountState";
-- =============================================================================

-- Stato di sicurezza dell'account, separato da "User" per non toccarne le colonne.
-- Assenza di riga = account creato prima di questa migrazione (email non marcata).
CREATE TABLE IF NOT EXISTS "AccountState" (
  "userId"          TEXT        NOT NULL,
  "emailVerifiedAt" TIMESTAMPTZ,
  -- Incrementato a cambio/reset password: invalida le sessioni JWT emesse prima.
  "sessionVersion"  INTEGER     NOT NULL DEFAULT 0,
  "updatedAt"       TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT "AccountState_pkey" PRIMARY KEY ("userId"),
  CONSTRAINT "AccountState_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

-- Token monouso per verifica email e cambio email (solo hash SHA-256 salvato).
CREATE TABLE IF NOT EXISTS "EmailToken" (
  "id"        TEXT        NOT NULL,
  "userId"    TEXT        NOT NULL,
  "purpose"   TEXT        NOT NULL,
  "tokenHash" TEXT        NOT NULL,
  "newEmail"  TEXT,
  "expiresAt" TIMESTAMPTZ NOT NULL,
  "usedAt"    TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT "EmailToken_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "EmailToken_tokenHash_key" UNIQUE ("tokenHash"),
  CONSTRAINT "EmailToken_purpose_check" CHECK ("purpose" IN ('VERIFY_EMAIL', 'CHANGE_EMAIL')),
  CONSTRAINT "EmailToken_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "EmailToken_userId_idx" ON "EmailToken"("userId");

ALTER TABLE "AccountState" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "EmailToken" ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON TABLE "AccountState" FROM anon;
    REVOKE ALL ON TABLE "EmailToken" FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON TABLE "AccountState" FROM authenticated;
    REVOKE ALL ON TABLE "EmailToken" FROM authenticated;
  END IF;
END $$;
