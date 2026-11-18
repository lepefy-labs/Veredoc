import { AnalysisStatus, DocumentType, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { DASHBOARD_DOCUMENT_PAGE_SIZE, summarizeDocument, type DashboardDocumentPage } from "./summary";
import { INSIGHT_DOCUMENT_LIMIT } from "@/lib/insights/trends";

type DocumentRow = Parameters<typeof summarizeDocument>[0];

const summaryColumns = Prisma.sql`
  d.id, d."profileId", d.type::text AS type, d."fileName", d.status::text AS status, d."createdAt",
  jsonb_build_object(
    'importo_totale', d.analysis->'importo_totale', 'stipendio_netto', d.analysis->'stipendio_netto',
    'fornitore', d.analysis->'fornitore', 'datore_lavoro', d.analysis->'datore_lavoro'
  ) AS analysis
`;

export function documentPage(rows: DocumentRow[]): DashboardDocumentPage {
  const page = rows.slice(0, DASHBOARD_DOCUMENT_PAGE_SIZE);
  return {
    documents: page.map(summarizeDocument),
    nextCursor: rows.length > DASHBOARD_DOCUMENT_PAGE_SIZE ? page[page.length - 1].id : null,
  };
}

export async function readFirstDocumentPages(userId: string) {
  const rows = await prisma.$queryRaw<DocumentRow[]>(Prisma.sql`
    SELECT page.*
    FROM "AnalysisProfile" p
    CROSS JOIN LATERAL (
      SELECT ${summaryColumns}
      FROM "Document" d
      WHERE d."profileId" = p.id AND d."userId" = p."userId" AND d.status <> 'DELETED'
      ORDER BY d."createdAt" DESC, d.id DESC
      LIMIT ${DASHBOARD_DOCUMENT_PAGE_SIZE + 1}
    ) page
    WHERE p."userId" = ${userId}
    ORDER BY page."createdAt" DESC, page.id DESC
  `);

  const byProfile = new Map<string, DocumentRow[]>();
  for (const row of rows) {
    const documents = byProfile.get(row.profileId) ?? [];
    documents.push(row);
    byProfile.set(row.profileId, documents);
  }
  return byProfile;
}

export async function readNextDocumentPage(userId: string, profileId: string, cursor: string) {
  // Anche dopo uno spostamento o un soft delete, la riga conserva la coppia di ordinamento.
  const rows = await prisma.$queryRaw<DocumentRow[]>(Prisma.sql`
    SELECT ${summaryColumns}
    FROM "Document" d
    JOIN "AnalysisProfile" p ON p.id = d."profileId" AND p."userId" = d."userId"
    JOIN "Document" anchor ON anchor.id = ${cursor} AND anchor."userId" = d."userId"
    WHERE d."profileId" = ${profileId} AND d."userId" = ${userId} AND d.status <> 'DELETED'
      AND (d."createdAt", d.id) < (anchor."createdAt", anchor.id)
    ORDER BY d."createdAt" DESC, d.id DESC
    LIMIT ${DASHBOARD_DOCUMENT_PAGE_SIZE + 1}
  `);
  return documentPage(rows);
}

type InsightRow = {
  id: string;
  profileId: string;
  type: DocumentType;
  status: AnalysisStatus;
  createdAt: Date;
  analysis: Prisma.JsonValue;
};

export async function readInsightDocuments(userId: string) {
  const rows = await prisma.$queryRaw<InsightRow[]>(Prisma.sql`
    SELECT sample.*
    FROM "AnalysisProfile" p
    CROSS JOIN unnest(enum_range(NULL::"DocumentType")) AS document_type(value)
    CROSS JOIN LATERAL (
      SELECT d."profileId", d.type::text AS type, d.status::text AS status, d."createdAt", d.analysis, d.id
      FROM "Document" d
      WHERE d."profileId" = p.id AND d."userId" = p."userId" AND d.type = document_type.value
        AND d.status = 'DONE' AND jsonb_typeof(d.analysis) = 'object'
      ORDER BY d."createdAt" DESC, d.id DESC
      LIMIT ${INSIGHT_DOCUMENT_LIMIT}
    ) sample
    WHERE p."userId" = ${userId}
    ORDER BY sample."createdAt" DESC, sample.id DESC
  `);

  const byProfile = new Map<string, InsightRow[]>();
  for (const row of rows) {
    const documents = byProfile.get(row.profileId) ?? [];
    documents.push(row);
    byProfile.set(row.profileId, documents);
  }
  return byProfile;
}
