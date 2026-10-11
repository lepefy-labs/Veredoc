// Servizio centralizzato per le email transazionali Brevo (solo server-side).
// Nessuna route deve chiamare direttamente l'API HTTP di Brevo.
// I log non contengono indirizzi email, contenuti o corpi di risposta del provider.

import { getAppBaseUrl } from "./notifications/config.ts";

export const SENDER = { name: "Veredoc", email: "noreply@veredoc.it" };

const BREVO_SMTP_ENDPOINT = "https://api.brevo.com/v3/smtp/email";
export const BREVO_TIMEOUT_MS = 10_000;

export interface TransactionalEmail {
  to: string;
  subject: string;
  htmlContent: string;
  textContent: string;
  // UUID v4. Brevo rifiuta (duplicate_parameter) un secondo invio con la stessa chiave
  // entro la sua finestra di validità (documentata tra 15 e 30 minuti).
  idempotencyKey?: string;
  tags?: string[];
}

export type EmailFailureKind =
  | "not_configured" // chiave API assente: nulla è stato inviato
  | "rate_limited"   // 429: rifiutato, ritentabile
  | "auth"           // 401/403: rifiutato, configurazione da correggere, ritentabile
  | "rejected"       // altro 4xx: richiesta non valida, definitivo
  | "ambiguous";     // timeout, errore di rete o 5xx: il provider potrebbe aver accettato

export type EmailSendResult =
  | { ok: true; messageId: string | null; deduplicated: boolean }
  | { ok: false; kind: EmailFailureKind; code: string; httpStatus?: number };

export interface EmailTransportOptions {
  apiKey?: string;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
}

async function readProviderCode(res: Response): Promise<string | null> {
  try {
    const body = await res.json() as { code?: unknown };
    return typeof body.code === "string" ? body.code.slice(0, 64) : null;
  } catch {
    return null;
  }
}

export async function sendTransactionalEmail(
  email: TransactionalEmail,
  options: EmailTransportOptions = {}
): Promise<EmailSendResult> {
  const apiKey = options.apiKey ?? process.env.BREVO_API_KEY;
  if (!apiKey?.trim()) return { ok: false, kind: "not_configured", code: "brevo_not_configured" };

  const fetchImpl = options.fetchImpl ?? fetch;
  const payload: Record<string, unknown> = {
    sender: SENDER,
    to: [{ email: email.to }],
    subject: email.subject,
    htmlContent: email.htmlContent,
    textContent: email.textContent,
  };
  if (email.idempotencyKey) payload.headers = { idempotencyKey: email.idempotencyKey };
  if (email.tags?.length) payload.tags = email.tags;

  let res: Response;
  try {
    res = await fetchImpl(BREVO_SMTP_ENDPOINT, {
      method: "POST",
      headers: {
        "api-key": apiKey,
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(options.timeoutMs ?? BREVO_TIMEOUT_MS),
    });
  } catch (error) {
    const timeout = error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError");
    return { ok: false, kind: "ambiguous", code: timeout ? "provider_timeout" : "provider_network_error" };
  }

  if (res.ok) {
    let messageId: string | null = null;
    try {
      const body = await res.json() as { messageId?: unknown };
      messageId = typeof body.messageId === "string" ? body.messageId.slice(0, 255) : null;
    } catch {
      messageId = null;
    }
    return { ok: true, messageId, deduplicated: false };
  }

  const providerCode = await readProviderCode(res);
  // Stessa idempotencyKey già accettata: il messaggio è stato preso in carico da un tentativo precedente.
  if (email.idempotencyKey && providerCode === "duplicate_parameter") {
    return { ok: true, messageId: null, deduplicated: true };
  }
  if (res.status === 429) return { ok: false, kind: "rate_limited", code: "provider_rate_limited", httpStatus: 429 };
  if (res.status === 401 || res.status === 403) {
    return { ok: false, kind: "auth", code: "provider_unauthorized", httpStatus: res.status };
  }
  if (res.status >= 500) return { ok: false, kind: "ambiguous", code: "provider_unavailable", httpStatus: res.status };
  return { ok: false, kind: "rejected", code: providerCode ? `provider_${providerCode}` : "provider_rejected", httpStatus: res.status };
}

export async function sendPasswordResetEmail(to: string, token: string, options: EmailTransportOptions = {}) {
  const resetUrl = new URL(`/reset-password?token=${encodeURIComponent(token)}`, getAppBaseUrl()).toString();

  const textContent = `Ciao,

Abbiamo ricevuto una richiesta per reimpostare la password del tuo account Veredoc.

Per procedere, apri questo link:
${resetUrl}

Se non hai richiesto tu il reset, ignora questa email. Il link scade tra un'ora.

Il team Veredoc`;

  const htmlContent = textContent
    .split("\n")
    .map((line) => (line ? `<p>${line}</p>` : ""))
    .join("\n");

  const result = await sendTransactionalEmail({
    to,
    subject: "Reimposta la tua password Veredoc",
    htmlContent,
    textContent,
    tags: ["password-reset"],
  }, options);

  if (!result.ok) {
    console.error(`Errore invio email Brevo (${result.code}${result.httpStatus ? `, status ${result.httpStatus}` : ""})`);
  }
  return result;
}
