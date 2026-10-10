import { createClient } from "@supabase/supabase-js";
import { prisma } from "@/lib/prisma";
import { analyzeDocument } from "@/lib/ai";
import { arricchisciConFrontoMercato } from "@/lib/parsers/bolletta";
import { verificaBustaPaga } from "@/lib/parsers/bustapaga";
import { validateBollettaOutput, validateBustaPagaOutput } from "@/lib/ai/validate";
import { validateDocumentBuffer, type AcceptedMimeType } from "@/lib/documents/upload-validation";
import { logOperationalEvent } from "@/lib/observability/operations";
import { getDelayedThresholdSeconds, isDelayedNoticeEnabled, isNotificationOutboxEnabled } from "@/lib/notifications/config";
import { startDelayedNoticeTimer } from "@/lib/notifications/delayed-notice";
import type { NotificationIntent } from "@/lib/notifications/events";
import { withOutboxEventSql } from "@/lib/notifications/notification-sql";
import { dispatchDocumentNotifications } from "@/lib/notifications/dispatcher";
import { Prisma } from "@prisma/client";
import type { BollettaRaw } from "@/types/bolletta";
import type { BustaPagaData } from "@/types/bustapaga";
import {
  claimAnalysisSql,
  completeAnalysisSql,
  exhaustAnalysisSql,
  releaseAnalysisSql,
  saveExtractionSql,
} from "@/lib/jobs/analysis-sql";
import {
  createDocumentAnalysisProcessor,
  MAX_ANALYSIS_ATTEMPTS,
  ANALYSIS_LEASE_TIMEOUT_MS,
  shouldRecoverAnalysis,
  type AnalysisOutcome,
  type AnalysisRunResult,
  type DocumentAnalysisStore,
} from "@/lib/jobs/process-document-core";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// Transizione finale + evento outbox in un'unica istruzione SQL (atomica).
// Con NOTIFICATIONS_ENABLED spento (tabella non ancora migrata) resta il semplice UPDATE.
async function writeWithNotification(
  update: Prisma.Sql,
  documentId: string,
  notification: NotificationIntent | undefined
): Promise<number> {
  if (!notification || !isNotificationOutboxEnabled()) return prisma.$executeRaw(update);
  const result = await prisma.$queryRaw<{ rows: number }[]>(withOutboxEventSql(update, documentId, notification));
  return Number(result[0]?.rows ?? 0);
}

const store: DocumentAnalysisStore = {
  async findById(documentId) {
    return prisma.document.findUnique({
      where: { id: documentId },
      select: {
        id: true,
        type: true,
        filePath: true,
        status: true,
        analysis: true,
        rawExtracted: true,
        updatedAt: true,
        deletedAt: true,
      },
    });
  },
  claim: (input) => prisma.$executeRaw(claimAnalysisSql({ ...input, job: { ...input.job } })),
  saveExtraction: (input) => prisma.$executeRaw(saveExtractionSql({ ...input, job: { ...input.job } })),
  complete: ({ notification, ...input }) =>
    writeWithNotification(completeAnalysisSql(input), input.documentId, notification),
  release: ({ notification, ...input }) =>
    writeWithNotification(releaseAnalysisSql(input), input.documentId, input.status === "ERROR" ? notification : undefined),
  exhaust: ({ notification, ...input }) =>
    writeWithNotification(exhaustAnalysisSql(input), input.documentId, notification),
};

export const processDocumentAnalysis = createDocumentAnalysisProcessor({
  store,
  async download(filePath) {
    const { data, error } = await getSupabase().storage.from("documents").download(filePath);
    if (error || !data) {
      throw new Error(`Download documento fallito: ${error?.message ?? "file non disponibile"}`);
    }
    return Buffer.from(await data.arrayBuffer());
  },
  validateBuffer: validateDocumentBuffer,
  analyze: (input) => analyzeDocument({
    ...input,
    mimeType: input.mimeType as AcceptedMimeType,
  }),
  validateBill: (raw) => validateBollettaOutput(raw),
  validatePayroll: (raw) => validateBustaPagaOutput(raw),
  enrichBill: (validated) => arricchisciConFrontoMercato(validated as unknown as BollettaRaw),
  verifyPayroll: (validated) => verificaBustaPaga(validated as unknown as BustaPagaData),
  log: logOperationalEvent,
});

const NOTIFIABLE_OUTCOMES = new Set<AnalysisOutcome>([
  "completed",
  "completed_without_market",
  "unsupported",
  "failed",
  "exhausted",
]);

// Esegue l'analisi e, se il documento ha raggiunto uno stato finale, invia subito la relativa
// email chiamando Brevo. Con `delayedNotice` (upload e riprova manuale, cioè l'inizio di un
// ciclo) avvia in parallelo il timer dell'avviso di attesa prolungata.
// L'invio non influisce mai sull'esito dell'analisi.
export async function processDocumentAnalysisAndNotify(
  documentId: string,
  options: { delayedNotice?: boolean } = {}
): Promise<AnalysisRunResult> {
  const notificationsEnabled = isNotificationOutboxEnabled();
  // +1 s: la soglia è verificata in SQL con l'orologio del DB.
  const timer = options.delayedNotice && notificationsEnabled && isDelayedNoticeEnabled()
    ? startDelayedNoticeTimer(
      getDelayedThresholdSeconds() * 1000 + 1000,
      () => dispatchDocumentNotifications(documentId, { enqueueDelayed: true })
    )
    : null;

  let result: AnalysisRunResult;
  try {
    result = await processDocumentAnalysis(documentId);
  } catch (error) {
    await timer?.cancel();
    throw error;
  }

  const final = NOTIFIABLE_OUTCOMES.has(result.outcome);
  if (timer) {
    if (final) await timer.cancel();
    else await timer.wait();
  }
  if (final && notificationsEnabled) {
    await dispatchDocumentNotifications(documentId);
  }
  return result;
}

export {
  MAX_ANALYSIS_ATTEMPTS,
  ANALYSIS_LEASE_TIMEOUT_MS,
  shouldRecoverAnalysis,
};
