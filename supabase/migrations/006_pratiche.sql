-- CreateTable
CREATE TABLE "KnowledgeSource" (
    "id" TEXT NOT NULL,
    "authority" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "provenance" JSONB,
    "acquiredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "verifiedAt" TIMESTAMP(3),

    CONSTRAINT "KnowledgeSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KnowledgeRevision" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "contentHash" TEXT NOT NULL,
    "acquiredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effectiveAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "diff" JSONB,

    CONSTRAINT "KnowledgeRevision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProcedureDefinition" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "audience" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "authority" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "metadata" JSONB,

    CONSTRAINT "ProcedureDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProcedureVersion" (
    "id" TEXT NOT NULL,
    "procedureId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "definition" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "approvedAt" TIMESTAMP(3),
    "effectiveAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProcedureVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProcedureCitation" (
    "id" TEXT NOT NULL,
    "procedureVersionId" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "revisionId" TEXT NOT NULL,
    "instructionIds" TEXT[],

    CONSTRAINT "ProcedureCitation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserCase" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "profileId" TEXT,
    "procedureVersionId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "revision" INTEGER NOT NULL DEFAULT 0,
    "idempotencyKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "UserCase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CaseAnswer" (
    "caseId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "revision" INTEGER NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CaseAnswer_pkey" PRIMARY KEY ("caseId","questionId")
);

-- CreateTable
CREATE TABLE "CaseStep" (
    "caseId" TEXT NOT NULL,
    "stepId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "completedAt" TIMESTAMP(3),
    "metadata" JSONB,

    CONSTRAINT "CaseStep_pkey" PRIMARY KEY ("caseId","stepId")
);

-- CreateTable
CREATE TABLE "CaseEvent" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CaseEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "KnowledgeSource_url_key" ON "KnowledgeSource"("url");

-- CreateIndex
CREATE UNIQUE INDEX "KnowledgeRevision_sourceId_version_key" ON "KnowledgeRevision"("sourceId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "KnowledgeRevision_sourceId_contentHash_key" ON "KnowledgeRevision"("sourceId", "contentHash");

-- CreateIndex
CREATE UNIQUE INDEX "ProcedureDefinition_slug_key" ON "ProcedureDefinition"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "ProcedureVersion_procedureId_version_key" ON "ProcedureVersion"("procedureId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "ProcedureCitation_procedureVersionId_revisionId_key" ON "ProcedureCitation"("procedureVersionId", "revisionId");

-- CreateIndex
CREATE INDEX "UserCase_userId_updatedAt_idx" ON "UserCase"("userId", "updatedAt");

-- CreateIndex
CREATE INDEX "UserCase_profileId_idx" ON "UserCase"("profileId");

-- CreateIndex
CREATE UNIQUE INDEX "UserCase_userId_idempotencyKey_key" ON "UserCase"("userId", "idempotencyKey");

-- CreateIndex
CREATE INDEX "CaseEvent_caseId_createdAt_idx" ON "CaseEvent"("caseId", "createdAt");

-- AddForeignKey
ALTER TABLE "KnowledgeRevision" ADD CONSTRAINT "KnowledgeRevision_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "KnowledgeSource"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcedureVersion" ADD CONSTRAINT "ProcedureVersion_procedureId_fkey" FOREIGN KEY ("procedureId") REFERENCES "ProcedureDefinition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcedureCitation" ADD CONSTRAINT "ProcedureCitation_procedureVersionId_fkey" FOREIGN KEY ("procedureVersionId") REFERENCES "ProcedureVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcedureCitation" ADD CONSTRAINT "ProcedureCitation_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "KnowledgeSource"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcedureCitation" ADD CONSTRAINT "ProcedureCitation_revisionId_fkey" FOREIGN KEY ("revisionId") REFERENCES "KnowledgeRevision"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserCase" ADD CONSTRAINT "UserCase_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserCase" ADD CONSTRAINT "UserCase_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "AnalysisProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserCase" ADD CONSTRAINT "UserCase_procedureVersionId_fkey" FOREIGN KEY ("procedureVersionId") REFERENCES "ProcedureVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaseAnswer" ADD CONSTRAINT "CaseAnswer_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "UserCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaseStep" ADD CONSTRAINT "CaseStep_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "UserCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaseEvent" ADD CONSTRAINT "CaseEvent_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "UserCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "KnowledgeSource" ADD CONSTRAINT "KnowledgeSource_status_check" CHECK ("status" IN ('DRAFT', 'PENDING_REVIEW', 'VERIFIED', 'STALE', 'RETIRED'));
ALTER TABLE "KnowledgeRevision" ADD CONSTRAINT "KnowledgeRevision_status_check" CHECK ("status" IN ('DRAFT', 'PENDING_REVIEW', 'VERIFIED', 'STALE', 'RETIRED'));
ALTER TABLE "ProcedureDefinition" ADD CONSTRAINT "ProcedureDefinition_status_check" CHECK ("status" IN ('DRAFT', 'PUBLISHED', 'RETIRED'));
ALTER TABLE "ProcedureVersion" ADD CONSTRAINT "ProcedureVersion_status_check" CHECK ("status" IN ('DRAFT', 'PENDING_REVIEW', 'PUBLISHED', 'RETIRED'));
ALTER TABLE "UserCase" ADD CONSTRAINT "UserCase_status_check" CHECK ("status" IN ('DRAFT', 'IN_PROGRESS', 'BLOCKED', 'READY_TO_SUBMIT', 'USER_REPORTED_SUBMITTED', 'COMPLETED', 'CANCELLED'));
ALTER TABLE "CaseStep" ADD CONSTRAINT "CaseStep_status_check" CHECK ("status" IN ('PENDING', 'DONE', 'NOT_APPLICABLE'));
CREATE UNIQUE INDEX "ProcedureVersion_one_published" ON "ProcedureVersion"("procedureId") WHERE "status" = 'PUBLISHED';

CREATE OR REPLACE FUNCTION pratiche_immutable_version() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' AND OLD."status" IN ('PUBLISHED', 'RETIRED') THEN
    RAISE EXCEPTION 'Published procedure versions cannot be deleted';
  END IF;
  IF TG_OP = 'UPDATE' AND OLD."status" IN ('PUBLISHED', 'RETIRED') THEN
    IF NEW."definition" IS DISTINCT FROM OLD."definition" OR NEW."procedureId" IS DISTINCT FROM OLD."procedureId"
      OR NEW."version" IS DISTINCT FROM OLD."version" OR NEW."approvedAt" IS DISTINCT FROM OLD."approvedAt"
      OR NEW."effectiveAt" IS DISTINCT FROM OLD."effectiveAt"
      OR (NEW."status" <> OLD."status" AND NOT (OLD."status" = 'PUBLISHED' AND NEW."status" = 'RETIRED')) THEN
      RAISE EXCEPTION 'Published procedure versions are immutable';
    END IF;
  END IF;
  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END $$;
CREATE TRIGGER "ProcedureVersion_immutable" BEFORE UPDATE OR DELETE ON "ProcedureVersion" FOR EACH ROW EXECUTE FUNCTION pratiche_immutable_version();

CREATE OR REPLACE FUNCTION pratiche_citation_guard() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE target_version TEXT;
BEGIN
  target_version := CASE WHEN TG_OP = 'DELETE' THEN OLD."procedureVersionId" ELSE NEW."procedureVersionId" END;
  IF TG_OP = 'UPDATE' AND EXISTS (SELECT 1 FROM "ProcedureVersion" WHERE "id" = OLD."procedureVersionId" AND "status" IN ('PUBLISHED', 'RETIRED')) THEN
    RAISE EXCEPTION 'Citations of published versions are immutable';
  END IF;
  IF EXISTS (SELECT 1 FROM "ProcedureVersion" WHERE "id" = target_version AND "status" IN ('PUBLISHED', 'RETIRED')) THEN
    RAISE EXCEPTION 'Citations of published versions are immutable';
  END IF;
  IF TG_OP <> 'DELETE' AND NOT EXISTS (SELECT 1 FROM "KnowledgeRevision" WHERE "id" = NEW."revisionId" AND "sourceId" = NEW."sourceId") THEN
    RAISE EXCEPTION 'Citation source and revision mismatch';
  END IF;
  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END $$;
CREATE TRIGGER "ProcedureCitation_guard" BEFORE INSERT OR UPDATE OR DELETE ON "ProcedureCitation" FOR EACH ROW EXECUTE FUNCTION pratiche_citation_guard();

CREATE OR REPLACE FUNCTION pratiche_revision_guard() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' AND OLD."status" IN ('VERIFIED', 'STALE', 'RETIRED') THEN RAISE EXCEPTION 'Reviewed revisions cannot be deleted'; END IF;
  IF TG_OP = 'UPDATE' AND OLD."status" IN ('VERIFIED', 'STALE', 'RETIRED') AND
    (NEW."content" IS DISTINCT FROM OLD."content" OR NEW."contentHash" IS DISTINCT FROM OLD."contentHash" OR NEW."sourceId" IS DISTINCT FROM OLD."sourceId") THEN
    RAISE EXCEPTION 'Reviewed revision content is immutable';
  END IF;
  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END $$;
CREATE TRIGGER "KnowledgeRevision_guard" BEFORE UPDATE OR DELETE ON "KnowledgeRevision" FOR EACH ROW EXECUTE FUNCTION pratiche_revision_guard();

CREATE OR REPLACE FUNCTION pratiche_source_guard() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF OLD."status" IN ('VERIFIED', 'STALE', 'RETIRED') AND
    (NEW."url" IS DISTINCT FROM OLD."url" OR NEW."authority" IS DISTINCT FROM OLD."authority" OR NEW."title" IS DISTINCT FROM OLD."title") THEN
    RAISE EXCEPTION 'Reviewed source identity is immutable';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER "KnowledgeSource_guard" BEFORE UPDATE ON "KnowledgeSource" FOR EACH ROW EXECUTE FUNCTION pratiche_source_guard();

CREATE OR REPLACE FUNCTION pratiche_case_profile_guard() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW."profileId" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "AnalysisProfile" WHERE "id" = NEW."profileId" AND "userId" = NEW."userId") THEN
    RAISE EXCEPTION 'Profile does not belong to case owner';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER "UserCase_profile_guard" BEFORE INSERT OR UPDATE ON "UserCase" FOR EACH ROW EXECUTE FUNCTION pratiche_case_profile_guard();

CREATE TABLE "KnowledgeAudit" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "actorId" TEXT,
  "entityType" TEXT NOT NULL,
  "entityId" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "KnowledgeAudit_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX "KnowledgeAudit_entityType_entityId_createdAt_idx" ON "KnowledgeAudit"("entityType", "entityId", "createdAt");

ALTER TABLE "KnowledgeSource" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "KnowledgeRevision" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ProcedureDefinition" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ProcedureVersion" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ProcedureCitation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "UserCase" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CaseAnswer" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CaseStep" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CaseEvent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "KnowledgeAudit" ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE role_name TEXT;
BEGIN
  FOREACH role_name IN ARRAY ARRAY['anon', 'authenticated'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = role_name) THEN
      EXECUTE format('REVOKE ALL ON TABLE "KnowledgeSource", "KnowledgeRevision", "ProcedureDefinition", "ProcedureVersion", "ProcedureCitation", "UserCase", "CaseAnswer", "CaseStep", "CaseEvent", "KnowledgeAudit" FROM %I', role_name);
    END IF;
  END LOOP;
END $$;
