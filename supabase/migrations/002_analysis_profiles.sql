-- =============================================================================
-- Veredoc — Analysis profiles
-- Introduce soggetti/profili separati all'interno dello stesso account.
-- I documenti esistenti vengono assegnati automaticamente al profilo default "Io".
-- =============================================================================

DO $$ BEGIN
  CREATE TYPE "ProfileKind" AS ENUM ('PERSON', 'HOUSEHOLD', 'BUSINESS');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "AnalysisProfile" (
  "id"        TEXT          NOT NULL,
  "userId"    TEXT          NOT NULL,
  "label"     TEXT          NOT NULL,
  "kind"      "ProfileKind" NOT NULL DEFAULT 'PERSON',
  "isDefault" BOOLEAN       NOT NULL DEFAULT false,
  "createdAt" TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  CONSTRAINT "AnalysisProfile_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AnalysisProfile_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "AnalysisProfile_userId_idx"
  ON "AnalysisProfile"("userId");

CREATE UNIQUE INDEX IF NOT EXISTS "AnalysisProfile_one_default_per_user"
  ON "AnalysisProfile"("userId") WHERE "isDefault" = true;

DO $$ BEGIN
  CREATE TRIGGER "AnalysisProfile_updatedAt_trigger"
    BEFORE UPDATE ON "AnalysisProfile"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

INSERT INTO "AnalysisProfile" ("id", "userId", "label", "kind", "isDefault")
SELECT
  'profile_default_' || md5(u."id"),
  u."id",
  'Io',
  'PERSON'::"ProfileKind",
  true
FROM "User" u
WHERE NOT EXISTS (
  SELECT 1 FROM "AnalysisProfile" p
  WHERE p."userId" = u."id" AND p."isDefault" = true
);

ALTER TABLE "Document"
  ADD COLUMN IF NOT EXISTS "profileId" TEXT;

UPDATE "Document" d
SET "profileId" = p."id"
FROM "AnalysisProfile" p
WHERE d."profileId" IS NULL
  AND p."userId" = d."userId"
  AND p."isDefault" = true;

DO $$ BEGIN
  ALTER TABLE "Document"
    ADD CONSTRAINT "Document_profileId_fkey"
    FOREIGN KEY ("profileId") REFERENCES "AnalysisProfile"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "Document"
  ALTER COLUMN "profileId" SET NOT NULL;

CREATE INDEX IF NOT EXISTS "Document_profileId_idx"
  ON "Document"("profileId");

ALTER TABLE "AnalysisProfile" ENABLE ROW LEVEL SECURITY;
