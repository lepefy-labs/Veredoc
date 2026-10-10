// Regole condivise per email e password (registrazione, login, reset, cambio password).
// Modulo senza dipendenze di runtime: usato da route, client e test.

export const PASSWORD_MIN_LENGTH = 8;
// bcrypt considera solo i primi 72 byte: oltre, parti della password verrebbero ignorate.
export const PASSWORD_MAX_BYTES = 72;

const EMAIL_PATTERN = /^[^\s@<>()[\]\\,;:"]+@[^\s@<>()[\]\\,;:"]+\.[^\s@<>()[\]\\,;:"]{2,}$/;

// Gli indirizzi sono salvati in minuscolo: Mario@x.it e mario@x.it sono lo stesso account.
export function normalizeEmail(value: unknown): string {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

export function isValidEmail(email: string): boolean {
  return email.length > 0 && email.length <= 254 && EMAIL_PATTERN.test(email);
}

export type PasswordProblem = "missing" | "too_short" | "too_long";

export function passwordProblem(value: unknown): PasswordProblem | null {
  if (typeof value !== "string" || value.length === 0) return "missing";
  if (value.length < PASSWORD_MIN_LENGTH) return "too_short";
  if (new TextEncoder().encode(value).length > PASSWORD_MAX_BYTES) return "too_long";
  return null;
}

export const PASSWORD_PROBLEM_MESSAGES: Record<PasswordProblem, string> = {
  missing: "Inserisci una password.",
  too_short: `La password deve contenere almeno ${PASSWORD_MIN_LENGTH} caratteri.`,
  too_long: "La password è troppo lunga (massimo 72 caratteri).",
};

// Versione di Privacy Policy e Termini accettata alla registrazione.
// Aggiornarla quando cambia il testo di uno dei due documenti.
export const LEGAL_DOCUMENTS_VERSION = "2026-10";
