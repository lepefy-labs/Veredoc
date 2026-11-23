-- Migrazione additiva. Applicare solo dopo approvazione e verifica su Postgres isolato.
BEGIN;
SET LOCAL lock_timeout = '5s';

CREATE TABLE IF NOT EXISTS public."CaseDocument" (
  "caseId" text NOT NULL REFERENCES public."UserCase"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "stepId" text NOT NULL,
  "documentId" text NOT NULL REFERENCES public."Document"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CaseDocument_pkey" PRIMARY KEY ("caseId", "stepId", "documentId")
);
CREATE INDEX IF NOT EXISTS "CaseDocument_documentId_idx" ON public."CaseDocument" ("documentId");

ALTER TABLE public."CaseDocument" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public."CaseDocument" FROM PUBLIC;
DO $$
DECLARE role_name text;
BEGIN
  FOR role_name IN SELECT rolname FROM pg_roles WHERE rolname IN ('anon', 'authenticated')
  LOOP
    EXECUTE format('REVOKE ALL ON public."CaseDocument" FROM %I', role_name);
  END LOOP;
END
$$;

CREATE OR REPLACE FUNCTION public.pratiche_case_document_guard() RETURNS trigger
LANGUAGE plpgsql SET search_path = pg_catalog, public AS $$
DECLARE
  case_owner text;
  case_profile text;
  case_version text;
BEGIN
  SELECT "userId", "profileId", "procedureVersionId" INTO case_owner, case_profile, case_version
  FROM public."UserCase" WHERE "id" = NEW."caseId" FOR SHARE;

  IF case_profile IS NULL OR NOT EXISTS (
    SELECT 1 FROM public."Document"
     WHERE "id" = NEW."documentId" AND "userId" = case_owner AND "profileId" = case_profile
       AND "status" <> 'DELETED' AND "deletedAt" IS NULL AND "filePath" IS NOT NULL FOR SHARE
  ) THEN
    RAISE EXCEPTION 'Documento non disponibile per questo fascicolo' USING ERRCODE = '23514';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public."ProcedureVersion" AS pv,
      LATERAL jsonb_array_elements(pv."definition"->'steps') AS item
     WHERE pv."id" = case_version AND item->>'id' = NEW."stepId" AND item->>'kind' = 'document'
  ) THEN
    RAISE EXCEPTION 'Requisito documentale non valido' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END
$$;

DROP TRIGGER IF EXISTS "CaseDocument_guard" ON public."CaseDocument";
CREATE TRIGGER "CaseDocument_guard" BEFORE INSERT OR UPDATE ON public."CaseDocument"
FOR EACH ROW EXECUTE FUNCTION public.pratiche_case_document_guard();

CREATE OR REPLACE FUNCTION public.pratiche_clear_document_evidence() RETURNS trigger
LANGUAGE plpgsql SET search_path = pg_catalog, public AS $$
BEGIN
  IF NEW."profileId" IS DISTINCT FROM OLD."profileId"
     OR NEW."userId" IS DISTINCT FROM OLD."userId"
     OR NEW."status" = 'DELETED' OR NEW."deletedAt" IS NOT NULL OR NEW."filePath" IS NULL THEN
    DELETE FROM public."CaseDocument" WHERE "documentId" = NEW."id";
  END IF;
  RETURN NEW;
END
$$;

DROP TRIGGER IF EXISTS "Document_clear_case_evidence" ON public."Document";
CREATE TRIGGER "Document_clear_case_evidence" AFTER UPDATE OF "profileId", "userId", "status", "deletedAt", "filePath"
ON public."Document" FOR EACH ROW EXECUTE FUNCTION public.pratiche_clear_document_evidence();

CREATE OR REPLACE FUNCTION public.pratiche_clear_case_evidence() RETURNS trigger
LANGUAGE plpgsql SET search_path = pg_catalog, public AS $$
BEGIN
  IF NEW."profileId" IS DISTINCT FROM OLD."profileId"
     OR NEW."userId" IS DISTINCT FROM OLD."userId"
     OR NEW."procedureVersionId" IS DISTINCT FROM OLD."procedureVersionId" THEN
    DELETE FROM public."CaseDocument" WHERE "caseId" = NEW."id";
  END IF;
  RETURN NEW;
END
$$;

DROP TRIGGER IF EXISTS "UserCase_clear_evidence" ON public."UserCase";
CREATE TRIGGER "UserCase_clear_evidence" AFTER UPDATE OF "profileId", "userId", "procedureVersionId"
ON public."UserCase" FOR EACH ROW EXECUTE FUNCTION public.pratiche_clear_case_evidence();

COMMIT;
