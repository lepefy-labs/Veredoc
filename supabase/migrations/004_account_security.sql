-- =============================================================================
-- Veredoc — Sicurezza account: rate limit persistente e registro consensi
-- File: supabase/migrations/004_account_security.sql
--
-- Migrazione additiva: due tabelle nuove e un indice su lower("User"."email");
-- nessuna modifica a colonne esistenti, nessun backfill. Idempotente.
--
-- Prima dell'applicazione l'applicazione funziona comunque:
-- - rate limit in fail-open (evento di log security.rate_limit_unavailable);
-- - consenso alla registrazione non registrato (evento account.consent_not_recorded).
--
-- Rollback:
--   DROP TABLE IF EXISTS "RateLimitBucket";
--   DROP TABLE IF EXISTS "UserConsent";
--   DROP INDEX IF EXISTS "User_email_lower_idx";
-- =============================================================================

-- Contatori a finestra fissa. "key" = SHA-256 di <regola>:<email|ip|userId>:
-- nessun dato personale in chiaro. Righe più vecchie di 24 h eliminate dal job di recovery.
CREATE TABLE IF NOT EXISTS "RateLimitBucket" (
  "key"         TEXT        NOT NULL,
  "windowStart" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "count"       INTEGER     NOT NULL DEFAULT 0,

  CONSTRAINT "RateLimitBucket_pkey" PRIMARY KEY ("key")
);

CREATE INDEX IF NOT EXISTS "RateLimitBucket_windowStart_idx"
  ON "RateLimitBucket"("windowStart");

-- Prova del consenso a Privacy Policy e Termini (data e versione accettata).
CREATE TABLE IF NOT EXISTS "UserConsent" (
  "id"         TEXT        NOT NULL,
  "userId"     TEXT        NOT NULL,
  "kind"       TEXT        NOT NULL,
  "version"    TEXT        NOT NULL,
  "acceptedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT "UserConsent_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "UserConsent_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "UserConsent_userId_idx"
  ON "UserConsent"("userId");

-- Ricerca utente per email senza distinzione maiuscole/minuscole (login, reset, registrazione).
CREATE INDEX IF NOT EXISTS "User_email_lower_idx"
  ON "User"(lower("email"));

-- Tabelle solo server-side.
ALTER TABLE "RateLimitBucket" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "UserConsent" ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON TABLE "RateLimitBucket" FROM anon;
    REVOKE ALL ON TABLE "UserConsent" FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON TABLE "RateLimitBucket" FROM authenticated;
    REVOKE ALL ON TABLE "UserConsent" FROM authenticated;
  END IF;
END $$;
