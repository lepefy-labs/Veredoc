import { NextRequest, NextResponse } from "next/server";
import { AnalysisStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  ANALYSIS_LEASE_TIMEOUT_MS,
  processDocumentAnalysis,
  shouldRecoverAnalysis,
} from "@/lib/jobs/process-document";
import type { AnalysisOutcome } from "@/lib/jobs/process-document-core";
import { elapsedMs, logOperationalEvent, toSafeErrorMessage } from "@/lib/observability/operations";
import { isJobRequestAuthorized } from "@/lib/security/access";

export const maxDuration = 300;

const MAX_CANDIDATES = 20;
const MAX_ATTEMPTED_PER_RUN = 10;
// Non avvia nuove analisi oltre questa soglia: nel caso peggiore un'analisi dura ~4 minuti
// e la funzione ha un limite di 300 s.
const START_BUDGET_MS = 60_000;

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
    select: { id: true, status: true, updatedAt: true, deletedAt: true },
    orderBy: { updatedAt: "asc" },
    take: MAX_CANDIDATES,
  });

  const pending = candidates.filter((candidate) => candidate.status === AnalysisStatus.PENDING).length;
  const staleProcessing = candidates.length - pending;
  const outcomes: Partial<Record<AnalysisOutcome | "crashed", number>> = {};
  let attempted = 0;
  let deferred = 0;

  for (const candidate of candidates) {
    if (!shouldRecoverAnalysis(candidate)) continue;
    if (attempted >= MAX_ATTEMPTED_PER_RUN || elapsedMs(startedAt) > START_BUDGET_MS) {
      deferred += 1;
      continue;
    }
    attempted += 1;
    try {
      const result = await processDocumentAnalysis(candidate.id);
      outcomes[result.outcome] = (outcomes[result.outcome] ?? 0) + 1;
    } catch (error) {
      outcomes.crashed = (outcomes.crashed ?? 0) + 1;
      logOperationalEvent("analysis.worker_crashed", {
        documentId: candidate.id,
        trigger: "recovery_job",
        error: toSafeErrorMessage(error),
      }, "error");
    }
  }

  const durationMs = elapsedMs(startedAt);
  const summary = {
    candidates: candidates.length,
    pending,
    staleProcessing,
    attempted,
    deferred,
    completed: (outcomes.completed ?? 0) + (outcomes.completed_without_market ?? 0),
    retryScheduled: outcomes.retry_scheduled ?? 0,
    failed: (outcomes.failed ?? 0) + (outcomes.unsupported ?? 0),
    exhausted: outcomes.exhausted ?? 0,
    leaseLost: outcomes.lease_lost ?? 0,
    skipped: outcomes.skipped ?? 0,
    unconfirmed: (outcomes.persistence_unconfirmed ?? 0) + (outcomes.crashed ?? 0),
    durationMs,
  };

  logOperationalEvent(
    "job.process_analysis.completed",
    summary,
    summary.unconfirmed > 0 ? "error" : summary.failed + summary.exhausted > 0 ? "warn" : "info"
  );

  return NextResponse.json({ success: true, ...summary });
}
