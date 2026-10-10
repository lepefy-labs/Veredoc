import assert from "node:assert/strict";
import test from "node:test";
import {
  AMBIGUOUS_RETRY_WINDOW_MS,
  MAX_NOTIFICATION_ATTEMPTS,
  createNotificationDispatcher,
  isNotificationStillRelevant,
  type NotificationContext,
  type NotificationStore,
} from "../lib/notifications/dispatcher-core.ts";
import type { ClaimedNotificationRow } from "../lib/notifications/notification-sql.ts";
import type { NotificationEventType } from "../lib/notifications/events.ts";
import type { EmailSendResult, TransactionalEmail } from "../lib/email.ts";
import { isDeliverableEmail } from "../lib/notifications/config.ts";
import { renderAnalysisEmail } from "../lib/notifications/templates.ts";

// Store in memoria con la stessa semantica di lib/notifications/notification-sql.ts:
// claim atomico (JS è single-thread: nessun await tra lettura e scrittura), scritture condizionate al lease.
interface FakeRow {
  id: string;
  userId: string;
  documentId: string;
  eventType: NotificationEventType;
  analysisCycle: number;
  status: "PENDING" | "SENDING" | "SENT" | "FAILED" | "CANCELLED";
  attempts: number;
  nextAttemptAt: number;
  leaseId: string | null;
  leaseExpiresAt: number | null;
  lastSendStartedAt: number | null;
  ambiguousSince: number | null;
  lastErrorCode: string | null;
  providerMessageId: string | null;
}

class FakeNotificationStore implements NotificationStore {
  rows: FakeRow[] = [];
  nowMs: number;
  documents = new Map<string, NonNullable<NotificationContext["document"]>>();
  emails = new Map<string, string | null>();
  enqueuedDelayedCalls = 0;

  constructor(nowMs: number) {
    this.nowMs = nowMs;
  }

  add(row: Partial<FakeRow> & { id: string; eventType: NotificationEventType }) {
    this.rows.push({
      userId: "user-1",
      documentId: "doc-1",
      analysisCycle: 0,
      status: "PENDING",
      attempts: 0,
      nextAttemptAt: this.nowMs,
      leaseId: null,
      leaseExpiresAt: null,
      lastSendStartedAt: null,
      ambiguousSince: null,
      lastErrorCode: null,
      providerMessageId: null,
      ...row,
    });
  }

  row(id: string) {
    return this.rows.find((row) => row.id === id)!;
  }

  enqueuedFor: Array<string | null | undefined> = [];

  async enqueueDelayed(input: { documentId?: string | null }) {
    this.enqueuedDelayedCalls++;
    this.enqueuedFor.push(input.documentId);
    return 0;
  }

  async claim(input: { leaseId: string; leaseSeconds: number; limit: number; documentId?: string | null }) {
    const due = this.rows
      .filter((row) => !input.documentId || row.documentId === input.documentId)
      .filter((row) =>
        (row.status === "PENDING" && row.nextAttemptAt <= this.nowMs) ||
        (row.status === "SENDING" && (row.leaseExpiresAt ?? 0) < this.nowMs))
      .slice(0, input.limit);
    return due.map((row): ClaimedNotificationRow => {
      const previousStatus = row.status as "PENDING" | "SENDING";
      row.status = "SENDING";
      row.leaseId = input.leaseId;
      row.leaseExpiresAt = this.nowMs + input.leaseSeconds * 1000;
      row.attempts += 1;
      return {
        id: row.id,
        userId: row.userId,
        documentId: row.documentId,
        eventType: row.eventType,
        analysisCycle: row.analysisCycle,
        attempts: row.attempts,
        previousStatus,
        lastSendStartedAt: row.lastSendStartedAt ? new Date(row.lastSendStartedAt) : null,
        ambiguousSince: row.ambiguousSince ? new Date(row.ambiguousSince) : null,
      };
    });
  }

  async loadContext(row: ClaimedNotificationRow): Promise<NotificationContext> {
    return {
      document: this.documents.get(row.documentId) ?? null,
      recipientEmail: this.emails.has(row.userId) ? this.emails.get(row.userId)! : "utente@example.com",
    };
  }

  private guarded(id: string, leaseId: string) {
    const row = this.row(id);
    return row && row.status === "SENDING" && row.leaseId === leaseId ? row : null;
  }

  async markSendStarted(input: { id: string; leaseId: string; ambiguousSince: Date | null }) {
    const row = this.guarded(input.id, input.leaseId);
    if (!row) return 0;
    row.lastSendStartedAt = this.nowMs;
    row.ambiguousSince = row.ambiguousSince ?? (input.ambiguousSince ? input.ambiguousSince.getTime() : null);
    return 1;
  }

  async markSent(input: { id: string; leaseId: string; providerMessageId: string | null }) {
    const row = this.guarded(input.id, input.leaseId);
    if (!row) return 0;
    Object.assign(row, { status: "SENT", providerMessageId: input.providerMessageId, leaseId: null, leaseExpiresAt: null, lastErrorCode: null });
    return 1;
  }

  async reschedule(input: { id: string; leaseId: string; delaySeconds: number; errorCode: string; ambiguous: boolean }) {
    const row = this.guarded(input.id, input.leaseId);
    if (!row) return 0;
    if (input.ambiguous) row.ambiguousSince = row.ambiguousSince ?? row.lastSendStartedAt ?? this.nowMs;
    else row.lastSendStartedAt = null;
    Object.assign(row, {
      status: "PENDING",
      nextAttemptAt: this.nowMs + input.delaySeconds * 1000,
      lastErrorCode: input.errorCode,
      leaseId: null,
      leaseExpiresAt: null,
    });
    return 1;
  }

  async finish(input: { id: string; leaseId: string; status: "FAILED" | "CANCELLED"; errorCode: string }) {
    const row = this.guarded(input.id, input.leaseId);
    if (!row) return 0;
    Object.assign(row, { status: input.status, lastErrorCode: input.errorCode, leaseId: null, leaseExpiresAt: null });
    return 1;
  }
}

const T0 = new Date("2026-10-10T20:00:00.000Z").getTime();
const BASE_URL = "https://www.veredoc.it";

function createHarness(options: {
  responses?: Array<EmailSendResult | (() => Promise<EmailSendResult>)>;
  delayedEnabled?: boolean;
} = {}) {
  const store = new FakeNotificationStore(T0);
  store.documents.set("doc-1", { status: "DONE", deletedAt: null, type: "BOLLETTA_GAS", cycle: 0 });
  const sent: TransactionalEmail[] = [];
  const responses = [...(options.responses ?? [])];
  const events: Array<{ event: string; fields: Record<string, unknown> }> = [];
  let leaseCounter = 0;

  const deps = {
    store,
    async send(email: TransactionalEmail): Promise<EmailSendResult> {
      sent.push(email);
      const next = responses.shift();
      if (typeof next === "function") return next();
      return next ?? { ok: true, messageId: `<msg-${sent.length}@brevo>`, deduplicated: false };
    },
    render: (input: { eventType: NotificationEventType; documentType: string | null; documentId: string }) =>
      renderAnalysisEmail({ ...input, baseUrl: BASE_URL }),
    isDeliverableEmail,
    delayedNotice: { enabled: options.delayedEnabled ?? true, thresholdSeconds: 60, maxAgeSeconds: 1800 },
    now: () => new Date(store.nowMs),
    createLeaseId: () => `lease-${++leaseCounter}`,
    log: (event: string, fields: Record<string, unknown>) => events.push({ event, fields }),
  };

  return {
    store,
    sent,
    events,
    dispatch: createNotificationDispatcher(deps),
    advance(ms: number) {
      store.nowMs += ms;
    },
  };
}

const ID = "11111111-1111-4111-8111-111111111111";

test("DONE: email di completamento inviata una volta con idempotencyKey = id riga", async () => {
  const harness = createHarness();
  harness.store.add({ id: ID, eventType: "ANALYSIS_COMPLETED" });

  const summary = await harness.dispatch();

  assert.equal(summary.sent, 1);
  assert.equal(harness.sent.length, 1);
  assert.equal(harness.sent[0].idempotencyKey, ID);
  assert.equal(harness.sent[0].subject, "La tua analisi è pronta!");
  assert.equal(harness.sent[0].to, "utente@example.com");
  assert.match(harness.sent[0].htmlContent, /Bolletta gas/);
  assert.match(harness.sent[0].htmlContent, /https:\/\/www\.veredoc\.it\/analyze\?id=doc-1/);
  assert.equal(harness.store.row(ID).status, "SENT");
  assert.equal(harness.store.row(ID).providerMessageId, "<msg-1@brevo>");

  // Doppia esecuzione del dispatcher: nessun nuovo invio.
  assert.equal((await harness.dispatch()).claimed, 0);
  assert.equal(harness.sent.length, 1);
});

test("ERROR definitivo: comunicazione dedicata senza dettagli tecnici", async () => {
  const harness = createHarness();
  harness.store.documents.set("doc-1", { status: "ERROR", deletedAt: null, type: "BOLLETTA_LUCE", cycle: 0 });
  harness.store.add({ id: ID, eventType: "ANALYSIS_FAILED" });

  await harness.dispatch();

  assert.equal(harness.sent.length, 1);
  assert.equal(harness.sent[0].subject, "Non siamo riusciti a completare la tua analisi");
  assert.match(harness.sent[0].textContent, /Torna al documento/);
  // Prima del completamento il tipo è solo un'ipotesi: etichetta generica.
  assert.match(harness.sent[0].textContent, /Documento: Documento/);
  assert.doesNotMatch(harness.sent[0].htmlContent, /attempts_exhausted|ai_provider|stack|Error:/i);
});

test("attesa prolungata: avviso inviato se il documento è ancora in elaborazione", async () => {
  const harness = createHarness();
  harness.store.documents.set("doc-1", { status: "PROCESSING", deletedAt: null, type: "BOLLETTA_LUCE", cycle: 0 });
  harness.store.add({ id: ID, eventType: "ANALYSIS_DELAYED" });

  const summary = await harness.dispatch({ enqueueDelayed: true, documentId: "doc-1" });

  assert.equal(harness.store.enqueuedDelayedCalls, 1);
  assert.deepEqual(harness.store.enqueuedFor, ["doc-1"]);
  assert.equal(summary.sent, 1);
  assert.equal(harness.sent[0].subject, "Stiamo ancora analizzando il tuo documento");
  assert.match(harness.sent[0].textContent, /Non devi fare nulla: puoi tornare alle tue attività\./);
  assert.doesNotMatch(harness.sent[0].textContent, /\d+\s*(secondi|minuti)/);
});

test("attesa prolungata: documento completato prima dell'invio → avviso annullato", async () => {
  const harness = createHarness();
  harness.store.add({ id: ID, eventType: "ANALYSIS_DELAYED" });

  const summary = await harness.dispatch();

  assert.equal(summary.cancelled, 1);
  assert.equal(harness.sent.length, 0);
  assert.equal(harness.store.row(ID).lastErrorCode, "analysis_finished");
});

test("attesa prolungata disattivata: nessun accodamento e righe esistenti annullate", async () => {
  const harness = createHarness({ delayedEnabled: false });
  harness.store.documents.set("doc-1", { status: "PENDING", deletedAt: null, type: "BOLLETTA_LUCE", cycle: 0 });
  harness.store.add({ id: ID, eventType: "ANALYSIS_DELAYED" });

  await harness.dispatch({ enqueueDelayed: true });

  assert.equal(harness.store.enqueuedDelayedCalls, 0);
  assert.equal(harness.sent.length, 0);
  assert.equal(harness.store.row(ID).status, "CANCELLED");
});

test("documento eliminato: nessuna notifica", async () => {
  const harness = createHarness();
  harness.store.documents.set("doc-1", { status: "DELETED", deletedAt: new Date(T0), type: "BOLLETTA_LUCE", cycle: 0 });
  harness.store.add({ id: ID, eventType: "ANALYSIS_COMPLETED" });

  await harness.dispatch();

  assert.equal(harness.sent.length, 0);
  assert.equal(harness.store.row(ID).status, "CANCELLED");
  assert.equal(harness.store.row(ID).lastErrorCode, "document_deleted");
});

test("destinatario mancante o non valido: nessun invio", async () => {
  for (const email of [null, "", "non-una-email", "utente@dominio"]) {
    const harness = createHarness();
    harness.store.emails.set("user-1", email);
    harness.store.add({ id: ID, eventType: "ANALYSIS_COMPLETED" });

    await harness.dispatch();

    assert.equal(harness.sent.length, 0, `email ${String(email)}`);
    assert.equal(harness.store.row(ID).lastErrorCode, "invalid_recipient");
  }
});

test("indirizzo non confermato: nessun invio", async () => {
  const harness = createHarness();
  harness.store.add({ id: ID, eventType: "ANALYSIS_COMPLETED" });
  const loadContext = harness.store.loadContext.bind(harness.store);
  harness.store.loadContext = async (row) => ({ ...(await loadContext(row)), recipientVerified: false });

  await harness.dispatch();

  assert.equal(harness.sent.length, 0);
  assert.equal(harness.store.row(ID).lastErrorCode, "email_unverified");
});

test("riprova manuale avviata: l'errore del ciclo precedente non viene più notificato", async () => {
  const harness = createHarness();
  harness.store.documents.set("doc-1", { status: "PENDING", deletedAt: null, type: "BOLLETTA_LUCE", cycle: 1 });
  harness.store.add({ id: ID, eventType: "ANALYSIS_FAILED", analysisCycle: 0 });

  await harness.dispatch();

  assert.equal(harness.sent.length, 0);
  assert.equal(harness.store.row(ID).lastErrorCode, "cycle_superseded");
});

test("dispatch concorrente: due esecuzioni simultanee inviano una sola email", async () => {
  const harness = createHarness();
  harness.store.add({ id: ID, eventType: "ANALYSIS_COMPLETED" });
  harness.store.add({ id: "22222222-2222-4222-8222-222222222222", eventType: "ANALYSIS_COMPLETED", documentId: "doc-1" });

  const [first, second] = await Promise.all([harness.dispatch(), harness.dispatch({ documentId: "doc-1" })]);

  assert.equal(first.claimed + second.claimed, 2);
  assert.equal(harness.sent.length, 2);
  assert.equal(new Set(harness.sent.map((email) => email.idempotencyKey)).size, 2);
});

test("Brevo non disponibile: retry con la stessa idempotencyKey, poi invio", async () => {
  const harness = createHarness({
    responses: [{ ok: false, kind: "ambiguous", code: "provider_unavailable", httpStatus: 503 }],
  });
  harness.store.add({ id: ID, eventType: "ANALYSIS_COMPLETED" });

  const first = await harness.dispatch();
  assert.equal(first.retryScheduled, 1);
  assert.equal(harness.store.row(ID).status, "PENDING");
  assert.ok(harness.store.row(ID).ambiguousSince);

  // Prima della scadenza del backoff la riga non è dovuta.
  assert.equal((await harness.dispatch()).claimed, 0);

  harness.advance(61_000);
  const second = await harness.dispatch();
  assert.equal(second.sent, 1);
  assert.equal(harness.sent.length, 2);
  assert.equal(harness.sent[0].idempotencyKey, harness.sent[1].idempotencyKey);
  assert.equal(harness.store.row(ID).status, "SENT");
});

test("timeout dopo l'accettazione di Brevo: il nuovo tentativo viene deduplicato dal provider", async () => {
  const harness = createHarness({
    responses: [
      { ok: false, kind: "ambiguous", code: "provider_timeout" },
      { ok: true, messageId: null, deduplicated: true },
    ],
  });
  harness.store.add({ id: ID, eventType: "ANALYSIS_COMPLETED" });

  await harness.dispatch();
  harness.advance(61_000);
  const summary = await harness.dispatch();

  assert.equal(summary.deduplicated, 1);
  assert.equal(harness.store.row(ID).status, "SENT");
});

test("esito ambiguo oltre la finestra di idempotenza: nessun nuovo invio (niente duplicati)", async () => {
  const harness = createHarness({
    responses: [{ ok: false, kind: "ambiguous", code: "provider_timeout" }],
  });
  harness.store.add({ id: ID, eventType: "ANALYSIS_COMPLETED" });

  await harness.dispatch();
  harness.advance(AMBIGUOUS_RETRY_WINDOW_MS + 1_000);
  const summary = await harness.dispatch();

  assert.equal(summary.unconfirmed, 1);
  assert.equal(harness.sent.length, 1);
  assert.equal(harness.store.row(ID).status, "FAILED");
  assert.equal(harness.store.row(ID).lastErrorCode, "delivery_unconfirmed");
});

test("rate limit: backoff e righe successive del batch rimandate senza chiamare Brevo", async () => {
  const harness = createHarness({
    responses: [{ ok: false, kind: "rate_limited", code: "provider_rate_limited", httpStatus: 429 }],
  });
  harness.store.add({ id: ID, eventType: "ANALYSIS_COMPLETED" });
  harness.store.add({ id: "22222222-2222-4222-8222-222222222222", eventType: "ANALYSIS_COMPLETED" });

  const summary = await harness.dispatch({ concurrency: 1 });

  assert.equal(summary.rateLimited, true);
  assert.equal(summary.retryScheduled, 2);
  assert.equal(harness.sent.length, 1);
  assert.equal(harness.store.row(ID).ambiguousSince, null);
});

test("errore permanente del provider: FAILED senza retry", async () => {
  const harness = createHarness({
    responses: [{ ok: false, kind: "rejected", code: "provider_invalid_parameter", httpStatus: 400 }],
  });
  harness.store.add({ id: ID, eventType: "ANALYSIS_COMPLETED" });

  const summary = await harness.dispatch();

  assert.equal(summary.failed, 1);
  assert.equal(harness.store.row(ID).status, "FAILED");
  harness.advance(3_600_000);
  assert.equal((await harness.dispatch()).claimed, 0);
});

test("tentativi esauriti: FAILED dopo MAX_NOTIFICATION_ATTEMPTS errori non ambigui", async () => {
  const harness = createHarness({
    responses: Array.from({ length: MAX_NOTIFICATION_ATTEMPTS }, () => ({
      ok: false as const, kind: "auth" as const, code: "provider_unauthorized", httpStatus: 401,
    })),
  });
  harness.store.add({ id: ID, eventType: "ANALYSIS_COMPLETED" });

  for (let attempt = 0; attempt < MAX_NOTIFICATION_ATTEMPTS; attempt++) {
    await harness.dispatch();
    harness.advance(3 * 3_600_000);
  }

  assert.equal(harness.sent.length, MAX_NOTIFICATION_ATTEMPTS);
  assert.equal(harness.store.row(ID).status, "FAILED");
  assert.equal(harness.store.row(ID).lastErrorCode, "attempts_exhausted");
});

test("lease scaduto: riga SENDING recuperata; senza invio avviato si invia normalmente", async () => {
  const harness = createHarness();
  harness.store.add({ id: ID, eventType: "ANALYSIS_COMPLETED", status: "SENDING", leaseId: "dead", leaseExpiresAt: T0 - 1, attempts: 1 });

  const summary = await harness.dispatch();

  assert.equal(summary.sent, 1);
  assert.equal(harness.store.row(ID).attempts, 2);
});

test("lease scaduto dopo l'avvio dell'invio: ritentato con la stessa chiave entro la finestra, altrimenti FAILED", async () => {
  const recent = createHarness({ responses: [{ ok: true, messageId: null, deduplicated: true }] });
  recent.store.add({
    id: ID, eventType: "ANALYSIS_COMPLETED", status: "SENDING", leaseId: "dead",
    leaseExpiresAt: T0 - 1, attempts: 1, lastSendStartedAt: T0 - 200_000,
  });
  const recentSummary = await recent.dispatch();
  assert.equal(recentSummary.deduplicated, 1);
  assert.equal(recent.sent[0].idempotencyKey, ID);
  assert.ok(recent.events.some((entry) => entry.event === "notification.lease_recovered"));

  const stale = createHarness();
  stale.store.add({
    id: ID, eventType: "ANALYSIS_COMPLETED", status: "SENDING", leaseId: "dead",
    leaseExpiresAt: T0 - 1, attempts: 1, lastSendStartedAt: T0 - AMBIGUOUS_RETRY_WINDOW_MS - 1,
  });
  const staleSummary = await stale.dispatch();
  assert.equal(staleSummary.unconfirmed, 1);
  assert.equal(stale.sent.length, 0);
});

test("eccezione imprevista nel provider: la riga resta in lease e il batch continua", async () => {
  const harness = createHarness({
    responses: [async () => {
      throw new Error("bug");
    }],
  });
  harness.store.add({ id: ID, eventType: "ANALYSIS_COMPLETED" });
  harness.store.add({ id: "22222222-2222-4222-8222-222222222222", eventType: "ANALYSIS_COMPLETED" });

  const summary = await harness.dispatch({ concurrency: 1 });

  assert.equal(summary.crashed, 1);
  assert.equal(summary.sent, 1);
  assert.equal(harness.store.row(ID).status, "SENDING");
});

test("i log del dispatcher non contengono indirizzi email o contenuti", async () => {
  const harness = createHarness();
  harness.store.add({ id: ID, eventType: "ANALYSIS_COMPLETED" });
  await harness.dispatch();

  const serialized = JSON.stringify(harness.events);
  assert.doesNotMatch(serialized, /@example\.com/);
  assert.doesNotMatch(serialized, /La tua analisi/);
});

test("pertinenza: regole per evento", () => {
  const doc = (status: string, cycle = 0) => ({ status, deletedAt: null, type: "BOLLETTA_LUCE", cycle });
  assert.equal(isNotificationStillRelevant("ANALYSIS_COMPLETED", 1, doc("DONE", 0)).relevant, true);
  assert.equal(isNotificationStillRelevant("ANALYSIS_COMPLETED", 0, doc("PROCESSING")).relevant, false);
  assert.equal(isNotificationStillRelevant("ANALYSIS_FAILED", 0, doc("ERROR")).relevant, true);
  assert.equal(isNotificationStillRelevant("ANALYSIS_DELAYED", 0, doc("PENDING")).relevant, true);
  assert.equal(isNotificationStillRelevant("ANALYSIS_DELAYED", 0, doc("PENDING", 1)).relevant, false);
  assert.equal(isNotificationStillRelevant("ANALYSIS_DELAYED", 0, null).relevant, false);
});
