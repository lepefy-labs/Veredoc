import { Prisma } from "@prisma/client";

// Query SQL del lifecycle analisi.
//
// Il lease NON usa più `updatedAt` come compare-and-swap: in produzione il trigger
// `Document_updatedAt_trigger` (supabase/migrations/001_schema.sql) riscrive
// `updatedAt = NOW()` a ogni UPDATE, con precisione al microsecondo, mentre JS
// lavora al millisecondo. Ogni confronto di uguaglianza su `updatedAt` falliva
// quindi in silenzio.
//
// Regole:
// - il claim è atomico e valuta la scadenza del lease con l'orologio del DB;
// - ogni scrittura di un worker è vincolata al token `analysis._job.leaseId`;
// - `updatedAt` viene impostato esplicitamente a now() così il comportamento è
//   identico con o senza trigger.

export interface ClaimSqlInput {
  documentId: string;
  expectedAttempts: number;
  leaseTimeoutMs: number;
  job: Record<string, unknown>;
}

export function claimAnalysisSql(input: ClaimSqlInput): Prisma.Sql {
  const leaseSeconds = Math.ceil(input.leaseTimeoutMs / 1000);
  return Prisma.sql`
    UPDATE "Document"
    SET "status" = 'PROCESSING'::"AnalysisStatus",
        "analysis" = jsonb_build_object('_job', ${JSON.stringify(input.job)}::jsonb),
        "updatedAt" = now()
    WHERE "id" = ${input.documentId}
      AND "deletedAt" IS NULL
      AND "filePath" IS NOT NULL
      AND COALESCE(("analysis" -> '_job' ->> 'attempts')::int, 0) = ${input.expectedAttempts}
      AND (
        "status" = 'PENDING'::"AnalysisStatus"
        OR (
          "status" = 'PROCESSING'::"AnalysisStatus"
          AND "updatedAt" < now() - make_interval(secs => ${leaseSeconds})
        )
      )`;
}

export interface LeaseGuard {
  documentId: string;
  leaseId: string;
}

function leaseCondition(guard: LeaseGuard): Prisma.Sql {
  return Prisma.sql`"id" = ${guard.documentId}
      AND "status" = 'PROCESSING'::"AnalysisStatus"
      AND "deletedAt" IS NULL
      AND "analysis" -> '_job' ->> 'leaseId' = ${guard.leaseId}`;
}

export function saveExtractionSql(input: LeaseGuard & {
  type: string;
  rawExtracted: unknown;
  job: Record<string, unknown>;
}): Prisma.Sql {
  return Prisma.sql`
    UPDATE "Document"
    SET "type" = ${input.type}::"DocumentType",
        "rawExtracted" = ${JSON.stringify(input.rawExtracted)}::jsonb,
        "analysis" = jsonb_build_object('_job', ${JSON.stringify(input.job)}::jsonb),
        "updatedAt" = now()
    WHERE ${leaseCondition(input)}`;
}

export function completeAnalysisSql(input: LeaseGuard & {
  type: string;
  rawExtracted: unknown;
  analysis: unknown;
}): Prisma.Sql {
  return Prisma.sql`
    UPDATE "Document"
    SET "status" = 'DONE'::"AnalysisStatus",
        "type" = ${input.type}::"DocumentType",
        "typeCorrected" = false,
        "typeSelectedByUser" = NULL,
        "rawExtracted" = ${JSON.stringify(input.rawExtracted)}::jsonb,
        "analysis" = ${JSON.stringify(input.analysis)}::jsonb,
        "updatedAt" = now()
    WHERE ${leaseCondition(input)}`;
}

export function releaseAnalysisSql(input: LeaseGuard & {
  status: "PENDING" | "ERROR";
  analysis: unknown;
}): Prisma.Sql {
  return Prisma.sql`
    UPDATE "Document"
    SET "status" = ${input.status}::"AnalysisStatus",
        "analysis" = ${JSON.stringify(input.analysis)}::jsonb,
        "updatedAt" = now()
    WHERE ${leaseCondition(input)}`;
}

// Chiude come ERROR un documento con tentativi esauriti che nessun worker sta
// più elaborando (PENDING, oppure PROCESSING con lease scaduto).
export function exhaustAnalysisSql(input: {
  documentId: string;
  expectedAttempts: number;
  leaseTimeoutMs: number;
  analysis: unknown;
}): Prisma.Sql {
  const leaseSeconds = Math.ceil(input.leaseTimeoutMs / 1000);
  return Prisma.sql`
    UPDATE "Document"
    SET "status" = 'ERROR'::"AnalysisStatus",
        "analysis" = ${JSON.stringify(input.analysis)}::jsonb,
        "updatedAt" = now()
    WHERE "id" = ${input.documentId}
      AND "deletedAt" IS NULL
      AND COALESCE(("analysis" -> '_job' ->> 'attempts')::int, 0) = ${input.expectedAttempts}
      AND (
        "status" = 'PENDING'::"AnalysisStatus"
        OR (
          "status" = 'PROCESSING'::"AnalysisStatus"
          AND "updatedAt" < now() - make_interval(secs => ${leaseSeconds})
        )
      )`;
}

// Riporta in coda un documento in ERROR su richiesta esplicita del proprietario.
// Il confronto su manualRetries impedisce che due click concorrenti superino il limite.
export function requeueAnalysisSql(input: {
  documentId: string;
  userId: string;
  expectedManualRetries: number;
  analysis: unknown;
}): Prisma.Sql {
  return Prisma.sql`
    UPDATE "Document"
    SET "status" = 'PENDING'::"AnalysisStatus",
        "analysis" = ${JSON.stringify(input.analysis)}::jsonb,
        "updatedAt" = now()
    WHERE "id" = ${input.documentId}
      AND "userId" = ${input.userId}
      AND "status" = 'ERROR'::"AnalysisStatus"
      AND "deletedAt" IS NULL
      AND "filePath" IS NOT NULL
      AND COALESCE(("analysis" -> '_job' ->> 'manualRetries')::int, 0) = ${input.expectedManualRetries}`;
}
