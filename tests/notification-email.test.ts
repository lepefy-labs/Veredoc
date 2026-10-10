import assert from "node:assert/strict";
import test from "node:test";
import { SENDER, sendPasswordResetEmail, sendTransactionalEmail } from "../lib/email.ts";
import {
  canNotifyByEmail,
  getAppBaseUrl,
  getDelayedThresholdSeconds,
  isDelayedNoticeEnabled,
  isDeliverableEmail,
  isNotificationOutboxEnabled,
} from "../lib/notifications/config.ts";
import { buildNotificationEventKey, getAnalysisCycle } from "../lib/notifications/events.ts";
import { buildDocumentUrl, documentLabel, renderAnalysisEmail } from "../lib/notifications/templates.ts";
import { buildLoginRedirectPath, safeCallbackPath } from "../lib/security/redirect.ts";

type Captured = { url: string; init: RequestInit };

function mockFetch(response: () => Response | Promise<Response>) {
  const calls: Captured[] = [];
  const fetchImpl = (async (url: string, init: RequestInit) => {
    calls.push({ url, init });
    return response();
  }) as unknown as typeof fetch;
  return { calls, fetchImpl };
}

const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
const EMAIL = { to: "utente@example.com", subject: "Oggetto", htmlContent: "<p>x</p>", textContent: "x" };

test("Brevo: payload con sender, textContent e idempotencyKey nei headers", async () => {
  const { calls, fetchImpl } = mockFetch(() => json(201, { messageId: "<abc@smtp-relay>" }));

  const result = await sendTransactionalEmail({ ...EMAIL, idempotencyKey: "uuid-1", tags: ["t"] }, { apiKey: "key", fetchImpl });

  assert.deepEqual(result, { ok: true, messageId: "<abc@smtp-relay>", deduplicated: false });
  assert.equal(calls[0].url, "https://api.brevo.com/v3/smtp/email");
  assert.equal((calls[0].init.headers as Record<string, string>)["api-key"], "key");
  const body = JSON.parse(String(calls[0].init.body));
  assert.deepEqual(body.sender, { name: "Veredoc", email: "noreply@veredoc.it" });
  assert.deepEqual(body.headers, { idempotencyKey: "uuid-1" });
  assert.equal(body.textContent, "x");
  assert.ok(calls[0].init.signal, "timeout impostato");
});

test("Brevo: classificazione errori (duplicato, 429, 401, 5xx, 4xx, rete, timeout, chiave assente)", async () => {
  const cases: Array<[() => Response | Promise<Response>, Partial<{ ok: boolean; kind: string; deduplicated: boolean }>]> = [
    [() => json(400, { code: "duplicate_parameter", message: "dup" }), { ok: true, deduplicated: true }],
    [() => json(429, {}), { ok: false, kind: "rate_limited" }],
    [() => json(401, { code: "unauthorized" }), { ok: false, kind: "auth" }],
    [() => json(503, {}), { ok: false, kind: "ambiguous" }],
    [() => json(400, { code: "invalid_parameter" }), { ok: false, kind: "rejected" }],
    [() => { throw new TypeError("fetch failed"); }, { ok: false, kind: "ambiguous" }],
    [() => { const error = new Error("timeout"); error.name = "TimeoutError"; throw error; }, { ok: false, kind: "ambiguous" }],
  ];
  for (const [response, expected] of cases) {
    const { fetchImpl } = mockFetch(response);
    const result = await sendTransactionalEmail({ ...EMAIL, idempotencyKey: "uuid-1" }, { apiKey: "key", fetchImpl });
    for (const [key, value] of Object.entries(expected)) {
      assert.equal((result as Record<string, unknown>)[key], value, JSON.stringify(result));
    }
  }

  const missing = await sendTransactionalEmail(EMAIL, { apiKey: "", fetchImpl: mockFetch(() => json(201, {})).fetchImpl });
  assert.deepEqual(missing, { ok: false, kind: "not_configured", code: "brevo_not_configured" });

  // Senza idempotencyKey un 400 duplicate_parameter non è un successo.
  const { fetchImpl } = mockFetch(() => json(400, { code: "duplicate_parameter" }));
  assert.equal((await sendTransactionalEmail(EMAIL, { apiKey: "key", fetchImpl })).ok, false);
});

test("reset password: nessuna regressione su destinatario, oggetto, link e mittente", async () => {
  const { calls, fetchImpl } = mockFetch(() => json(201, { messageId: "<r@brevo>" }));
  const originalError = console.error;
  const logged: string[] = [];
  console.error = (...args: unknown[]) => logged.push(args.join(" "));
  try {
    await sendPasswordResetEmail("utente@example.com", "token123", { apiKey: "key", fetchImpl });
    const body = JSON.parse(String(calls[0].init.body));
    assert.deepEqual(body.to, [{ email: "utente@example.com" }]);
    assert.equal(body.subject, "Reimposta la tua password Veredoc");
    assert.deepEqual(body.sender, SENDER);
    assert.match(body.htmlContent, /https:\/\/veredoc\.it\/reset-password\?token=token123/);
    assert.match(body.textContent, /Il link scade tra un'ora\./);
    assert.equal(body.headers, undefined);

    // Errore del provider: nessuna eccezione e nessun indirizzo nei log.
    const failing = mockFetch(() => { throw new TypeError("fetch failed"); });
    const result = await sendPasswordResetEmail("utente@example.com", "token123", { apiKey: "key", fetchImpl: failing.fetchImpl });
    assert.equal(result.ok, false);
    assert.equal(logged.length, 1);
    assert.doesNotMatch(logged[0], /utente@example\.com|token123/);
  } finally {
    console.error = originalError;
  }
});

const SENSITIVE = [
  "RSSMRA80A01H501U", // codice fiscale
  "IT001E12345678",   // POD
  "Via Roma 1",
  "Acme S.p.A.",
  "1.234,56",
  "84,20",
  "cedolino_mario_rossi.pdf",
];

test("template: nessun dato sensibile, solo categoria generica, stato e CTA", () => {
  for (const eventType of ["ANALYSIS_DELAYED", "ANALYSIS_COMPLETED", "ANALYSIS_FAILED"] as const) {
    const email = renderAnalysisEmail({ eventType, documentType: "BUSTA_PAGA", documentId: "cmdoc123", baseUrl: "https://www.veredoc.it" });
    for (const content of [email.htmlContent, email.textContent]) {
      for (const value of SENSITIVE) assert.ok(!content.includes(value), `${eventType} contiene ${value}`);
      assert.ok(content.includes("https://www.veredoc.it/analyze?id=cmdoc123"));
      assert.doesNotMatch(content, /<script|javascript:/i);
      assert.ok(content.includes("Il team Veredoc"));
    }
    assert.match(email.htmlContent, /max-width:600px/);
  }

  const done = renderAnalysisEmail({ eventType: "ANALYSIS_COMPLETED", documentType: "BUSTA_PAGA", documentId: "d", baseUrl: "https://www.veredoc.it" });
  assert.equal(done.subject, "La tua analisi è pronta!");
  assert.match(done.htmlContent, /Visualizza la tua analisi →/);
  assert.match(done.htmlContent, /Busta paga/);
  assert.match(done.htmlContent, /Analisi completata/);
});

test("template: etichette generiche e URL del documento codificato", () => {
  assert.equal(documentLabel("ANALYSIS_COMPLETED", "BOLLETTA_LUCE"), "Bolletta luce");
  assert.equal(documentLabel("ANALYSIS_COMPLETED", "BOLLETTA_INTERNET"), "Bolletta internet");
  assert.equal(documentLabel("ANALYSIS_COMPLETED", "SCONOSCIUTO"), "Documento");
  assert.equal(documentLabel("ANALYSIS_DELAYED", "BUSTA_PAGA"), "Documento");
  assert.equal(buildDocumentUrl("https://www.veredoc.it", "a&b\"<x>"), "https://www.veredoc.it/analyze?id=a%26b%22%3Cx%3E");
  const html = renderAnalysisEmail({ eventType: "ANALYSIS_FAILED", documentType: null, documentId: "a\"<x>", baseUrl: "https://www.veredoc.it" }).htmlContent;
  assert.doesNotMatch(html, /"<x>/);
});

test("config: flag, soglia, URL canonico da configurazione e validazione email", () => {
  assert.equal(isNotificationOutboxEnabled({}), false);
  assert.equal(isNotificationOutboxEnabled({ NOTIFICATIONS_ENABLED: "true" }), true);
  assert.equal(isDelayedNoticeEnabled({}), true);
  assert.equal(isDelayedNoticeEnabled({ NOTIFICATION_DELAYED_ENABLED: "false" }), false);
  assert.equal(getDelayedThresholdSeconds({}), 60);
  assert.equal(getDelayedThresholdSeconds({ NOTIFICATION_DELAYED_THRESHOLD_SECONDS: "120" }), 120);
  assert.equal(getDelayedThresholdSeconds({ NOTIFICATION_DELAYED_THRESHOLD_SECONDS: "1" }), 60);
  assert.equal(getAppBaseUrl({}), "https://www.veredoc.it");
  assert.equal(getAppBaseUrl({ NEXTAUTH_URL: "http://localhost:3000" }), "https://www.veredoc.it");
  assert.equal(getAppBaseUrl({ APP_BASE_URL: "https://app.veredoc.it/x" }), "https://app.veredoc.it");
  assert.equal(isDeliverableEmail("nome.cognome+tag@example.it"), true);
  for (const value of ["", null, undefined, "x", "a@b", "a b@c.it", "<a@b.it>"]) assert.equal(isDeliverableEmail(value), false);

  const enabled = { NOTIFICATIONS_ENABLED: "true", BREVO_API_KEY: "k" };
  assert.equal(canNotifyByEmail("utente@example.com", enabled), true);
  assert.equal(canNotifyByEmail("utente@example.com", { NOTIFICATIONS_ENABLED: "true" }), false);
  assert.equal(canNotifyByEmail("non-valida", enabled), false);
  assert.equal(canNotifyByEmail("utente@example.com", { BREVO_API_KEY: "k" }), false);
});

test("eventi: chiave per ciclo di analisi", () => {
  assert.equal(buildNotificationEventKey("ANALYSIS_COMPLETED", "doc", 0), "analysis_completed:doc:0");
  assert.notEqual(buildNotificationEventKey("ANALYSIS_COMPLETED", "doc", 0), buildNotificationEventKey("ANALYSIS_COMPLETED", "doc", 1));
  assert.equal(getAnalysisCycle({ _job: { manualRetries: 2 } }), 2);
  assert.equal(getAnalysisCycle({ tipo: "luce" }), 0);
  assert.equal(getAnalysisCycle(null), 0);
});

test("link diretto con autenticazione: destinazione conservata e open redirect bloccati", () => {
  assert.equal(buildLoginRedirectPath("/analyze", "?id=cmdoc123"), "/login?callbackUrl=%2Fanalyze%3Fid%3Dcmdoc123");
  assert.equal(safeCallbackPath("/analyze?id=cmdoc123"), "/analyze?id=cmdoc123");
  assert.equal(safeCallbackPath("/dashboard"), "/dashboard");
  assert.equal(
    safeCallbackPath("https://www.veredoc.it/analyze?id=cmdoc123", "/dashboard", "https://www.veredoc.it"),
    "/analyze?id=cmdoc123"
  );
  for (const malicious of [
    "https://evil.example/analyze",
    "//evil.example/analyze",
    "/\\evil.example",
    "javascript:alert(1)",
    "/api/documents/x",
    "/login",
    null,
  ]) {
    assert.equal(safeCallbackPath(malicious, "/dashboard", "https://www.veredoc.it"), "/dashboard", String(malicious));
  }
});
