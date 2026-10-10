// POST /api/documents/[id]/retry
// Riaccoda un documento in ERROR su richiesta del proprietario.
// Non crea un nuovo documento (nessun consumo di quota) ed è limitato a MAX_MANUAL_RETRIES.
// Se esiste un'estrazione già validata, il worker la riutilizza senza una nuova chiamata AI.

import { after, NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { processDocumentAnalysisAndNotify } from "@/lib/jobs/process-document";
import { canRetryAnalysisManually, getAnalysisJob } from "@/lib/jobs/process-document-core";
import { requeueAnalysisSql } from "@/lib/jobs/analysis-sql";
import { isDocumentOwner } from "@/lib/security/access";
import { logOperationalEvent, toSafeErrorMessage } from "@/lib/observability/operations";

export const maxDuration = 300;

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autenticato." }, { status: 401 });
  }

  const { id } = await params;
  const document = await prisma.document.findUnique({
    where: { id },
    select: { id: true, userId: true, status: true, analysis: true, deletedAt: true, filePath: true },
  });

  if (!document || document.deletedAt) {
    return NextResponse.json({ error: "Documento non trovato." }, { status: 404 });
  }
  if (!isDocumentOwner(session.user.id, document.userId)) {
    return NextResponse.json({ error: "Non autorizzato." }, { status: 403 });
  }
  if (!document.filePath || !canRetryAnalysisManually(document)) {
    return NextResponse.json({ error: "Questo documento non può essere rianalizzato. Carica un nuovo file." }, { status: 409 });
  }

  const previousJob = getAnalysisJob(document.analysis);
  const manualRetries = previousJob.manualRetries ?? 0;
  const rows = await prisma.$executeRaw(requeueAnalysisSql({
    documentId: document.id,
    userId: session.user.id,
    expectedManualRetries: manualRetries,
    analysis: {
      _job: {
        attempts: 0,
        manualRetries: manualRetries + 1,
        extracted: previousJob.extracted === true,
        phase: "manual_retry",
        lastErrorCode: previousJob.lastErrorCode ?? null,
        // Nuovo ciclo di analisi: la soglia dell'avviso di attesa parte da qui.
        cycleStartedAt: new Date().toISOString(),
      },
    },
  }));

  if (rows === 0) {
    return NextResponse.json({ error: "Il documento è già stato rimesso in coda." }, { status: 409 });
  }

  logOperationalEvent("analysis.manual_retry", { documentId: document.id, manualRetry: manualRetries + 1 });

  after(async () => {
    try {
      await processDocumentAnalysisAndNotify(document.id);
    } catch (error) {
      logOperationalEvent("analysis.worker_crashed", {
        documentId: document.id,
        trigger: "manual_retry",
        error: toSafeErrorMessage(error),
      }, "error");
    }
  });

  return NextResponse.json({ id: document.id, status: "PENDING" }, { status: 202 });
}
