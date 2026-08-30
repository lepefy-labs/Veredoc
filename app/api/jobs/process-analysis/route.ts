import { NextRequest, NextResponse } from "next/server";
import { AnalysisStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  ANALYSIS_LEASE_TIMEOUT_MS,
  processDocumentAnalysis,
  shouldRecoverAnalysis,
} from "@/lib/jobs/process-document";
import { elapsedMs, logOperationalEvent } from "@/lib/observability/operations";
import { isJobRequestAuthorized } from "@/lib/security/access";

export async function POST(req: NextRequest) {
  if (!isJobRequestAuthorized(req.headers.get("authorization"))) {
    return NextResponse.json({ error: "Non autorizzato." }, { status: 401 });
  }

  const startedAt = Date.now();
  const staleBefore = new Date(Date.now() - ANALYSIS_LEASE_TIMEOUT_MS);
  const candidates = await prisma.document.findMany({
    where: {
      deletedAt: null,
      filePath: { not: null },
      OR: [
        { status: AnalysisStatus.PENDING },
        { status: AnalysisStatus.PROCESSING, updatedAt: { lt: staleBefore } },
      ],
    },
    select: { id: true, status: true, analysis: true, updatedAt: true },
    orderBy: { updatedAt: "asc" },
    take: 20,
  });

  const pending = candidates.filter((candidate) => candidate.status === AnalysisStatus.PENDING).length;
  const staleProcessing = candidates.length - pending;
  let recoverable = 0;
  let attempted = 0;
  let claimed = 0;

  for (const candidate of candidates) {
    if (!shouldRecoverAnalysis(candidate)) continue;
    recoverable += 1;
    attempted += 1;
    if (await processDocumentAnalysis(candidate.id)) claimed += 1;
    if (attempted >= 10) break;
  }

  const durationMs = elapsedMs(startedAt);
  logOperationalEvent("job.process_analysis.completed", {
    candidates: candidates.length,
    pending,
    staleProcessing,
    recoverable,
    attempted,
    claimed,
    durationMs,
  }, attempted > 0 && claimed === 0 ? "warn" : "info");

  return NextResponse.json({
    success: true,
    candidates: candidates.length,
    pending,
    staleProcessing,
    recoverable,
    attempted,
    claimed,
    durationMs,
  });
}
