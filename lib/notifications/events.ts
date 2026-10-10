// Eventi notificabili del lifecycle analisi.
//
// Un "ciclo di analisi" comprende l'upload (ciclo 0) e ogni riprova manuale
// (ciclo = analysis._job.manualRetries). I retry automatici restano nello stesso ciclo.
// L'eventKey include il ciclo: un nuovo ciclo legittimo può notificare di nuovo,
// una doppia esecuzione del worker nello stesso ciclo no.

export type NotificationEventType = "ANALYSIS_DELAYED" | "ANALYSIS_COMPLETED" | "ANALYSIS_FAILED";

export interface NotificationIntent {
  eventType: Exclude<NotificationEventType, "ANALYSIS_DELAYED">;
  cycle: number;
}

const EVENT_KEY_PREFIX: Record<NotificationEventType, string> = {
  ANALYSIS_DELAYED: "analysis_delayed",
  ANALYSIS_COMPLETED: "analysis_completed",
  ANALYSIS_FAILED: "analysis_failed",
};

export function buildNotificationEventKey(eventType: NotificationEventType, documentId: string, cycle: number): string {
  return `${EVENT_KEY_PREFIX[eventType]}:${documentId}:${cycle}`;
}

export function eventKeyPrefix(eventType: NotificationEventType): string {
  return EVENT_KEY_PREFIX[eventType];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function getAnalysisCycle(analysis: unknown): number {
  const job = isRecord(analysis) && isRecord(analysis._job) ? analysis._job : null;
  const value = job?.manualRetries;
  return typeof value === "number" && Number.isInteger(value) && value >= 0 ? value : 0;
}
