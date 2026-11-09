import "server-only";
import { prisma } from "@/lib/prisma";
import { PracticeError } from "./service";
import { hasVerifiedCoverage } from "./publication";

export function isPracticeReviewer(userId: string): boolean {
  return Boolean(userId && process.env.PRATICHE_REVIEWER_IDS?.split(",").map((id) => id.trim()).includes(userId));
}

export async function adminSnapshot() {
  const [sources, procedures, audit] = await Promise.all([
    prisma.knowledgeSource.findMany({ include: { revisions: { orderBy: { version: "desc" as const } } }, orderBy: { title: "asc" as const } }),
    prisma.procedureDefinition.findMany({ include: { versions: { orderBy: { version: "desc" as const }, include: { citations: { include: { source: { select: { title: true, url: true, status: true } }, revision: { select: { version: true, status: true } } } } } } }, orderBy: { title: "asc" as const } }),
    prisma.knowledgeAudit.findMany({ take: 50, orderBy: { createdAt: "desc" as const }, select: { id: true, entityType: true, entityId: true, action: true, createdAt: true } }),
  ]);
  return { sources, procedures, audit };
}

export async function reviewSource(actorId: string, sourceId: string, revisionId: string) {
  if (!isPracticeReviewer(actorId)) throw new PracticeError("Non autorizzato.", 403);
  return prisma.$transaction(async (tx) => {
    const revision = await tx.knowledgeRevision.findFirst({ where: { id: revisionId, sourceId }, include: { source: true } });
    if (!revision || !["PENDING_REVIEW", "STALE"].includes(revision.status) || revision.source.status === "RETIRED") throw new PracticeError("Revisione non disponibile.", 409);
    const newer = await tx.knowledgeRevision.findFirst({ where: { sourceId, version: { gt: revision.version } } });
    if (newer) throw new PracticeError("Esiste una revisione più recente.", 409);
    await tx.knowledgeRevision.update({ where: { id: revisionId }, data: { status: "VERIFIED" } });
    await tx.knowledgeSource.update({ where: { id: sourceId }, data: { status: "VERIFIED", verifiedAt: new Date() } });
    await tx.knowledgeAudit.create({ data: { actorId, entityType: "SOURCE", entityId: sourceId, action: "VERIFIED", metadata: { revisionId } } });
  });
}

export async function publishProcedure(actorId: string, versionId: string) {
  if (!isPracticeReviewer(actorId)) throw new PracticeError("Non autorizzato.", 403);
  return prisma.$transaction(async (tx) => {
    const version = await tx.procedureVersion.findUnique({ where: { id: versionId }, include: { citations: { include: { source: { include: { revisions: { orderBy: { version: "desc" }, take: 1 } } }, revision: true } } } });
    if (!version || !["DRAFT", "PENDING_REVIEW"].includes(version.status) || !hasVerifiedCoverage(version)) throw new PracticeError("Fonti o istruzioni non sufficienti.", 409);
    const other = await tx.procedureVersion.findFirst({ where: { procedureId: version.procedureId, status: "PUBLISHED" } });
    if (other) throw new PracticeError("Ritira la versione precedente prima di pubblicare.", 409);
    await tx.procedureVersion.update({ where: { id: versionId }, data: { status: "PUBLISHED", approvedAt: new Date() } });
    await tx.procedureDefinition.update({ where: { id: version.procedureId }, data: { status: "PUBLISHED" } });
    await tx.knowledgeAudit.create({ data: { actorId, entityType: "PROCEDURE_VERSION", entityId: versionId, action: "PUBLISHED" } });
  });
}

export async function retireVersion(actorId: string, versionId: string) {
  if (!isPracticeReviewer(actorId)) throw new PracticeError("Non autorizzato.", 403);
  return prisma.$transaction(async (tx) => {
    const version = await tx.procedureVersion.findUnique({ where: { id: versionId } });
    if (!version || version.status !== "PUBLISHED") throw new PracticeError("Versione non pubblicata.", 409);
    await tx.procedureVersion.update({ where: { id: versionId }, data: { status: "RETIRED" } });
    await tx.procedureDefinition.update({ where: { id: version.procedureId }, data: { status: "RETIRED" } });
    await tx.knowledgeAudit.create({ data: { actorId, entityType: "PROCEDURE_VERSION", entityId: versionId, action: "RETIRED" } });
  });
}
