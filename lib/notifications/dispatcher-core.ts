// Dispatcher delle notifiche transazionali (logica pura, testabile).
//
// Per ogni riga reclamata:
// 1. ricontrolla documento, ciclo di analisi e destinatario subito prima dell'invio;
// 2. annulla (CANCELLED) gli eventi non più pertinenti: documento eliminato, già
//    completato durante l'attesa, nuovo ciclo avviato, email non utilizzabile;
// 3. invia tramite il servizio email riusando l'id della riga come idempotencyKey;
// 4. registra l'esito con scritture condizionate al lease.
//
// Garanzie e limiti sui duplicati:
// - un solo evento logico per eventKey (vincolo UNIQUE);
// - una sola riga in invio alla volta (claim atomico + lease con token);
// - esito ambiguo (timeout, errore di rete, 5xx, worker interrotto dopo l'avvio dell'invio):
//   il nuovo tentativo riusa la stessa idempotencyKey e Brevo rifiuta il duplicato
//   (duplicate_parameter, trattato come SENT). La chiave però vale solo per una finestra
//   limitata (documentata tra 15 e 30 minuti): oltre AMBIGUOUS_RETRY_WINDOW_MS non si
//   ritenta più e la riga va in FAILED con delivery_unconfirmed. Si accetta quindi il raro
//   rischio di una email mancata piuttosto che quello di un duplicato.

import type { NotificationEventType } from "./events.ts";
import type { EmailSendResult, TransactionalEmail } from "../email.ts";
import type { ClaimedNotificationRow } from "./notification-sql.ts";

export const NOTIFICATION_LEASE_SECONDS = 180;
export const MAX_NOTIFICATION_ATTEMPTS = 8;
export const AMBIGUOUS_RETRY_WINDOW_MS = 10 * 60 * 1000;
export const AMBIGUOUS_RETRY_DELAY_SECONDS = 60;
export const DEFAULT_BATCH_SIZE = 20;
export const DEFAULT_CONCURRENCY = 4;
const BACKOFF_SECONDS = [60, 120, 300, 600, 1800, 3600, 7200];

export function backoffSeconds(attempts: number): number {
  return BACKOFF_SECONDS[Math.min(Math.max(attempts - 1, 0), BACKOFF_SECONDS.length - 1)];
}

export interface NotificationContext {
  document: {
    status: string;
    deletedAt: Date | null;
    type: string | null;
    cycle: number;
  } | null;
  recipientEmail: string | null;
}

export interface NotificationStore {
  enqueueDelayed(input: { thresholdSeconds: number; maxAgeSeconds: number; limit: number }): Promise<number>;
  claim(input: { leaseId: string; leaseSeconds: number; limit: number; documentId?: string | null }): Promise<ClaimedNotificationRow[]>;
  loadContext(row: ClaimedNotificationRow): Promise<NotificationContext>;
  markSendStarted(input: { id: string; leaseId: string; ambiguousSince: Date | null }): Promise<number>;
  markSent(input: { id: string; leaseId: string; providerMessageId: string | null }): Promise<number>;
  reschedule(input: { id: string; leaseId: string; delaySeconds: number; errorCode: string; ambiguous: boolean }): Promise<number>;
  finish(input: { id: string; leaseId: string; status: "FAILED" | "CANCELLED"; errorCode: string }): Promise<number>;
  purge?(): Promise<number>;
}

export interface DispatcherLogFields {
  [key: string]: string | number | boolean | null | undefined;
}

export interface NotificationDispatcherDependencies {
  store: NotificationStore;
  send(email: TransactionalEmail): Promise<EmailSendResult>;
  render(input: { eventType: NotificationEventType; documentType: string | null; documentId: string }): {
    subject: string;
    htmlContent: string;
    textContent: string;
  };
  isDeliverableEmail(email: string | null | undefined): boolean;
  delayedNotice: { enabled: boolean; thresholdSeconds: number; maxAgeSeconds: number };
  now?: () => Date;
  createLeaseId?: () => string;
  log?: (event: string, fields: DispatcherLogFields, level?: "info" | "warn" | "error") => void;
}

export type NotificationOutcome =
  | "sent"
  | "deduplicated"
  | "cancelled"
  | "retry_scheduled"
  | "failed"
  | "unconfirmed"
  | "lease_lost";

export interface DispatchSummary {
  enqueuedDelayed: number;
  claimed: number;
  sent: number;
  deduplicated: number;
  cancelled: number;
  retryScheduled: number;
  failed: number;
  unconfirmed: number;
  leaseLost: number;
  crashed: number;
  purged: number;
  rateLimited: boolean;
  durationMs: number;
}

const ACTIVE_STATUSES = new Set(["PENDING", "PROCESSING"]);

// L'evento è ancora vero per il documento nello stato attuale?
export function isNotificationStillRelevant(
  eventType: NotificationEventType,
  eventCycle: number,
  document: NotificationContext["document"]
): { relevant: true } | { relevant: false; reason: string } {
  if (!document || document.deletedAt || document.status === "DELETED") return { relevant: false, reason: "document_deleted" };
  // DONE è terminale e la sua analisi finale non conserva _job: il ciclo si verifica solo
  // per gli eventi che un nuovo ciclo (riprova manuale da ERROR) può rendere obsoleti.
  if (eventType === "ANALYSIS_COMPLETED") {
    return document.status === "DONE" ? { relevant: true } : { relevant: false, reason: "not_done" };
  }
  if (document.cycle !== eventCycle) return { relevant: false, reason: "cycle_superseded" };
  if (eventType === "ANALYSIS_FAILED" && document.status !== "ERROR") return { relevant: false, reason: "not_error" };
  if (eventType === "ANALYSIS_DELAYED" && !ACTIVE_STATUSES.has(document.status)) return { relevant: false, reason: "analysis_finished" };
  return { relevant: true };
}

const noopLog: NonNullable<NotificationDispatcherDependencies["log"]> = () => {};

async function mapWithConcurrency<T>(items: T[], concurrency: number, worker: (item: T) => Promise<void>) {
  let index = 0;
  const runners = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (index < items.length) {
      const item = items[index++];
      await worker(item);
    }
  });
  await Promise.all(runners);
}

export function createNotificationDispatcher(deps: NotificationDispatcherDependencies) {
  const log = deps.log ?? noopLog;
  const now = () => deps.now?.() ?? new Date();
  const createLeaseId = deps.createLeaseId ?? (() => crypto.randomUUID());

  async function processRow(
    row: ClaimedNotificationRow,
    leaseId: string,
    state: { rateLimited: boolean }
  ): Promise<NotificationOutcome> {
    const base = { notificationId: row.id, documentId: row.documentId, eventType: row.eventType, attempt: row.attempts };
    const settle = async (rows: number, outcome: NotificationOutcome): Promise<NotificationOutcome> => {
      if (rows === 0) {
        log("notification.lease_lost", base, "warn");
        return "lease_lost";
      }
      return outcome;
    };
    const finish = async (status: "FAILED" | "CANCELLED", errorCode: string) => {
      const rows = await deps.store.finish({ id: row.id, leaseId, status, errorCode });
      log(status === "CANCELLED" ? "notification.cancelled" : "notification.failed", { ...base, errorCode }, status === "FAILED" ? "warn" : "info");
      const outcome: NotificationOutcome = status === "CANCELLED"
        ? "cancelled"
        : errorCode === "delivery_unconfirmed" ? "unconfirmed" : "failed";
      return settle(rows, outcome);
    };

    // Un rate limit nello stesso batch rimanda le righe successive senza chiamare il provider.
    if (state.rateLimited) {
      const rows = await deps.store.reschedule({ id: row.id, leaseId, delaySeconds: 60, errorCode: "provider_rate_limited", ambiguous: false });
      return settle(rows, "retry_scheduled");
    }

    const context = await deps.store.loadContext(row);
    const relevance = isNotificationStillRelevant(row.eventType, row.analysisCycle, context.document);
    if (!relevance.relevant) return finish("CANCELLED", relevance.reason);
    if (row.eventType === "ANALYSIS_DELAYED" && !deps.delayedNotice.enabled) return finish("CANCELLED", "delayed_notice_disabled");
    if (!deps.isDeliverableEmail(context.recipientEmail)) return finish("CANCELLED", "invalid_recipient");

    // Il worker precedente è morto dopo aver avviato l'invio: esito ambiguo.
    const recoveredAmbiguous = row.previousStatus === "SENDING" && row.lastSendStartedAt ? row.lastSendStartedAt : null;
    const ambiguousSince = row.ambiguousSince ?? recoveredAmbiguous;
    if (ambiguousSince && now().getTime() - ambiguousSince.getTime() > AMBIGUOUS_RETRY_WINDOW_MS) {
      return finish("FAILED", "delivery_unconfirmed");
    }
    if (recoveredAmbiguous) log("notification.lease_recovered", { ...base, ambiguous: true }, "warn");

    const rendered = deps.render({
      eventType: row.eventType,
      documentType: context.document?.type ?? null,
      documentId: row.documentId,
    });

    const started = await deps.store.markSendStarted({ id: row.id, leaseId, ambiguousSince });
    if (started === 0) return settle(0, "lease_lost");
    const startedAt = Date.now();
    const result = await deps.send({
      to: context.recipientEmail!.trim(),
      ...rendered,
      idempotencyKey: row.id,
      tags: [`veredoc-${row.eventType.toLowerCase().replace(/_/g, "-")}`],
    });
    const durationMs = Date.now() - startedAt;

    if (result.ok) {
      const rows = await deps.store.markSent({ id: row.id, leaseId, providerMessageId: result.messageId });
      log("notification.sent", { ...base, deduplicated: result.deduplicated, durationMs });
      return settle(rows, result.deduplicated ? "deduplicated" : "sent");
    }

    const exhausted = row.attempts >= MAX_NOTIFICATION_ATTEMPTS;
    if (result.kind === "rejected" || exhausted) {
      return finish("FAILED", exhausted && result.kind !== "rejected" ? "attempts_exhausted" : result.code);
    }

    if (result.kind === "rate_limited") state.rateLimited = true;
    const ambiguous = result.kind === "ambiguous";
    const delaySeconds = ambiguous ? AMBIGUOUS_RETRY_DELAY_SECONDS : backoffSeconds(row.attempts);
    const rows = await deps.store.reschedule({ id: row.id, leaseId, delaySeconds, errorCode: result.code, ambiguous });
    log("notification.retry_scheduled", { ...base, errorCode: result.code, ambiguous, delaySeconds, durationMs }, "warn");
    return settle(rows, "retry_scheduled");
  }

  return async function dispatchNotifications(options: {
    documentId?: string | null;
    batchSize?: number;
    concurrency?: number;
    enqueueDelayed?: boolean;
  } = {}): Promise<DispatchSummary> {
    const startedAt = Date.now();
    const summary: DispatchSummary = {
      enqueuedDelayed: 0,
      claimed: 0,
      sent: 0,
      deduplicated: 0,
      cancelled: 0,
      retryScheduled: 0,
      failed: 0,
      unconfirmed: 0,
      leaseLost: 0,
      crashed: 0,
      purged: 0,
      rateLimited: false,
      durationMs: 0,
    };

    if (options.enqueueDelayed && deps.delayedNotice.enabled) {
      summary.enqueuedDelayed = await deps.store.enqueueDelayed({
        thresholdSeconds: deps.delayedNotice.thresholdSeconds,
        maxAgeSeconds: deps.delayedNotice.maxAgeSeconds,
        limit: 50,
      });
    }

    const leaseId = createLeaseId();
    const rows = await deps.store.claim({
      leaseId,
      leaseSeconds: NOTIFICATION_LEASE_SECONDS,
      limit: options.batchSize ?? DEFAULT_BATCH_SIZE,
      documentId: options.documentId ?? null,
    });
    summary.claimed = rows.length;

    const state = { rateLimited: false };
    await mapWithConcurrency(rows, options.concurrency ?? DEFAULT_CONCURRENCY, async (row) => {
      let outcome: NotificationOutcome;
      try {
        outcome = await processRow(row, leaseId, state);
      } catch (error) {
        // La riga resta SENDING: verrà ripresa alla scadenza del lease.
        summary.crashed += 1;
        log("notification.dispatch_crashed", {
          notificationId: row.id,
          documentId: row.documentId,
          eventType: row.eventType,
          error: error instanceof Error ? error.name : "unknown",
        }, "error");
        return;
      }
      if (outcome === "sent") summary.sent += 1;
      else if (outcome === "deduplicated") summary.deduplicated += 1;
      else if (outcome === "cancelled") summary.cancelled += 1;
      else if (outcome === "retry_scheduled") summary.retryScheduled += 1;
      else if (outcome === "failed") summary.failed += 1;
      else if (outcome === "unconfirmed") summary.unconfirmed += 1;
      else summary.leaseLost += 1;
    });
    summary.rateLimited = state.rateLimited;

    if (!options.documentId && deps.store.purge) {
      summary.purged = await deps.store.purge().catch(() => 0);
    }

    summary.durationMs = Date.now() - startedAt;
    return summary;
  };
}
