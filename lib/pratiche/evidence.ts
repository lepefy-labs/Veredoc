import "server-only";
import { Prisma, AnalysisStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { applies } from "./engine";
import { caseView, PracticeError, readCase } from "./service";

const documentPreview = { id: true, fileName: true, createdAt: true } satisfies Prisma.DocumentSelect;
const pageSize = 20;

function storedDocument(userId: string, profileId: string): Prisma.DocumentWhereInput {
  return {
    userId, profileId, filePath: { not: null }, deletedAt: null, status: { not: AnalysisStatus.DELETED },
  };
}

async function readRequirement(userId: string, caseId: string, stepId: string, tx: Pick<Prisma.TransactionClient, "userCase"> = prisma) {
  const record = await readCase(userId, caseId, tx);
  if (!record) throw new PracticeError("Pratica non trovata.", 404);
  const view = caseView(record);
  const step = view.workflow.steps.find(({ id }) => id === stepId);
  if (!step || step.kind !== "document" || !applies(step.when, view.answers)) {
    throw new PracticeError("Requisito documentale non applicabile.", 404);
  }
  return record;
}

export async function readEvidence(userId: string, caseId: string, stepId: string, offset: number) {
  const record = await readRequirement(userId, caseId, stepId);
  const canAttach = Boolean(record.profileId && ["DRAFT", "IN_PROGRESS", "READY_TO_SUBMIT"].includes(record.status));
  if (!record.profileId) return { linked: [], available: [], canAttach, hasMore: false };

  const scopedDocument = storedDocument(userId, record.profileId);
  const [links, documents] = await Promise.all([
    prisma.caseDocument.findMany({
      where: { caseId, stepId, document: scopedDocument },
      select: { document: { select: documentPreview } },
      orderBy: [{ createdAt: "desc" }, { documentId: "desc" }],
    }),
    canAttach ? prisma.document.findMany({
      where: { ...scopedDocument, caseEvidence: { none: { caseId, stepId } } },
      select: documentPreview,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: offset,
      take: pageSize + 1,
    }) : [],
  ]);
  return { linked: links.map(({ document }) => document), available: documents.slice(0, pageSize), canAttach, hasMore: documents.length > pageSize };
}

export async function changeEvidence(userId: string, caseId: string, stepId: string, documentId: string, action: "link" | "unlink") {
  return prisma.$transaction(async (tx) => {
    const cases = await tx.$queryRaw<{ id: string }[]>`
      SELECT "id" FROM "UserCase" WHERE "id" = ${caseId} AND "userId" = ${userId} FOR UPDATE
    `;
    if (!cases.length) throw new PracticeError("Pratica non trovata.", 404);
    if (action === "unlink") {
      await tx.caseDocument.deleteMany({ where: { caseId, stepId, documentId } });
      return;
    }
    const record = await readRequirement(userId, caseId, stepId, tx);
    if (!record.profileId || !["DRAFT", "IN_PROGRESS", "READY_TO_SUBMIT"].includes(record.status)) {
      throw new PracticeError("La pratica non può ricevere documenti.", 409);
    }
    const documents = await tx.$queryRaw<{ id: string }[]>`
      SELECT "id" FROM "Document" WHERE "id" = ${documentId} AND "userId" = ${userId}
        AND "profileId" = ${record.profileId} AND "status" <> 'DELETED'
        AND "deletedAt" IS NULL AND "filePath" IS NOT NULL FOR SHARE
    `;
    if (!documents.length) throw new PracticeError("Documento non disponibile per questo profilo.", 404);
    await tx.caseDocument.createMany({ data: { caseId, stepId, documentId }, skipDuplicates: true });
  });
}
