import "server-only";
import { createHash } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { isOfficialUrl } from "@/lib/pratiche/engine";

export async function stageSourceRevision(sourceId: string, url: string, normalizedContent: string) {
  if (!isOfficialUrl(url) || normalizedContent.length < 20 || normalizedContent.length > 200_000) throw new Error("Fonte non valida");
  const contentHash = createHash("sha256").update(normalizedContent, "utf8").digest("hex");
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${sourceId}))`;
    const source = await tx.knowledgeSource.findUnique({ where: { id: sourceId }, include: { revisions: { orderBy: { version: "desc" }, take: 1 } } });
    if (!source || source.url !== url || source.status === "RETIRED") throw new Error("Fonte non consentita");
    const existing = await tx.knowledgeRevision.findFirst({ where: { sourceId, contentHash } });
    if (existing) return { changed: false, revisionId: existing.id };
    if (source.revisions[0] && Date.now() - source.revisions[0].acquiredAt.getTime() < 5 * 60_000) throw new Error("Acquisizione troppo frequente");
    const revision = await tx.knowledgeRevision.create({ data: { sourceId, version: (source.revisions[0]?.version ?? 0) + 1, content: normalizedContent, contentHash, status: "PENDING_REVIEW" } });
    await tx.knowledgeSource.update({ where: { id: sourceId }, data: { status: source.status === "VERIFIED" ? "STALE" : "PENDING_REVIEW" } });
    await tx.knowledgeAudit.create({ data: { entityType: "SOURCE", entityId: sourceId, action: "REVISION_STAGED", metadata: { revisionId: revision.id } } });
    return { changed: true, revisionId: revision.id };
  });
}
