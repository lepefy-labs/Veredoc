// Configurazione delle notifiche email transazionali.
// Modulo senza dipendenze di runtime: usato da route, worker e test.

type Env = Record<string, string | undefined>;

const DEFAULT_APP_BASE_URL = "https://www.veredoc.it";
export const DEFAULT_DELAYED_THRESHOLD_SECONDS = 60;
// Un documento fermo da oltre 30 minuti non riceve più l'avviso di attesa:
// evita email su documenti storici e avvisi ormai inutili.
export const DELAYED_NOTICE_MAX_AGE_SECONDS = 30 * 60;

function flag(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined || value.trim() === "") return fallback;
  return ["1", "true", "yes", "on"].includes(value.trim().toLowerCase());
}

// Interruttore principale. Va attivato SOLO dopo aver applicato
// supabase/migrations/003_notification_outbox.sql: con il flag spento
// l'applicazione non legge né scrive la tabella NotificationOutbox.
export function isNotificationOutboxEnabled(env: Env = process.env): boolean {
  return flag(env.NOTIFICATIONS_ENABLED, false);
}

export function isEmailProviderConfigured(env: Env = process.env): boolean {
  return Boolean(env.BREVO_API_KEY?.trim());
}

export function isDelayedNoticeEnabled(env: Env = process.env): boolean {
  return flag(env.NOTIFICATION_DELAYED_ENABLED, true);
}

export function getDelayedThresholdSeconds(env: Env = process.env): number {
  const parsed = Number.parseInt(env.NOTIFICATION_DELAYED_THRESHOLD_SECONDS ?? "", 10);
  if (!Number.isFinite(parsed) || parsed < 15 || parsed > DELAYED_NOTICE_MAX_AGE_SECONDS / 2) {
    return DEFAULT_DELAYED_THRESHOLD_SECONDS;
  }
  return parsed;
}

// URL canonico dell'applicazione: solo da configurazione, mai da header della richiesta.
export function getAppBaseUrl(env: Env = process.env): string {
  for (const candidate of [env.APP_BASE_URL, env.NEXTAUTH_URL]) {
    if (!candidate) continue;
    try {
      const url = new URL(candidate);
      if (url.protocol === "https:") return url.origin;
    } catch {
      // valore non valido: si passa al successivo
    }
  }
  return DEFAULT_APP_BASE_URL;
}

const EMAIL_PATTERN = /^[^\s@<>()[\]\\,;:"]+@[^\s@<>()[\]\\,;:"]+\.[^\s@<>()[\]\\,;:"]{2,}$/;

export function isDeliverableEmail(value: string | null | undefined): value is string {
  if (!value) return false;
  const email = value.trim();
  return email.length <= 254 && EMAIL_PATTERN.test(email);
}

// La UI promette l'email solo se l'intera catena è attiva per questo utente.
export function canNotifyByEmail(email: string | null | undefined, env: Env = process.env): boolean {
  return isNotificationOutboxEnabled(env) && isEmailProviderConfigured(env) && isDeliverableEmail(email);
}
