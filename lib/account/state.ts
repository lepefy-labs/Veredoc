import { prisma } from "@/lib/prisma";
import { isMissingTableError } from "@/lib/security/rate-limit";
import {
  bumpSessionVersionSql,
  ensureAccountStateSql,
  markEmailVerifiedSql,
  sessionStateSql,
  type SessionStateRow,
} from "@/lib/account/lifecycle-sql";

// Finché la migrazione 005 non è applicata le funzioni degradano senza errori.
// L'assenza della tabella viene ricordata per 5 minuti per non ripetere query fallite
// a ogni richiesta autenticata.
let missingUntil = 0;

function tableKnownMissing() {
  return Date.now() < missingUntil;
}

function rememberMissing(error: unknown): boolean {
  if (!isMissingTableError(error)) return false;
  missingUntil = Date.now() + 5 * 60 * 1000;
  return true;
}

export interface AccountSessionState {
  plan: string;
  email: string;
  // null = migrazione non applicata: nessun controllo di versione.
  sessionVersion: number | null;
  emailStatus: "verified" | "unverified" | "legacy" | "unknown";
}

// Cache breve per istanza: il callback jwt gira a ogni richiesta autenticata (anche il polling
// dell'analisi ogni 3 s). Le scritture fatte da questa istanza la invalidano subito; su altre
// istanze un cambio di piano, email o una revoca di sessione si propagano entro STATE_CACHE_MS.
const STATE_CACHE_MS = 15_000;
const STATE_CACHE_MAX = 5_000;
const stateCache = new Map<string, { value: AccountSessionState | null; expiresAt: number }>();

export function invalidateAccountState(userId: string): void {
  stateCache.delete(userId);
}

// Invalida prima e dopo la scrittura: una lettura concorrente non lascia in cache lo stato vecchio.
async function withInvalidation<T>(userId: string, write: () => Promise<T>): Promise<T> {
  invalidateAccountState(userId);
  try {
    return await write();
  } finally {
    invalidateAccountState(userId);
  }
}

export async function getAccountSessionState(userId: string, options: { fresh?: boolean } = {}): Promise<AccountSessionState | null> {
  const cached = options.fresh ? undefined : stateCache.get(userId);
  if (cached && cached.expiresAt > Date.now()) return cached.value;
  const value = await loadAccountSessionState(userId);
  if (stateCache.size >= STATE_CACHE_MAX) stateCache.clear();
  stateCache.set(userId, { value, expiresAt: Date.now() + STATE_CACHE_MS });
  return value;
}

async function loadAccountSessionState(userId: string): Promise<AccountSessionState | null> {
  if (!tableKnownMissing()) {
    try {
      const [row] = await prisma.$queryRaw<SessionStateRow[]>(sessionStateSql(userId));
      if (!row) return null;
      return {
        plan: row.plan,
        email: row.email,
        sessionVersion: row.hasState ? Number(row.sessionVersion ?? 0) : 0,
        emailStatus: !row.hasState ? "legacy" : row.emailVerifiedAt ? "verified" : "unverified",
      };
    } catch (error) {
      if (!rememberMissing(error)) throw error;
    }
  }
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { plan: true, email: true } });
  return user ? { plan: user.plan, email: user.email, sessionVersion: null, emailStatus: "unknown" } : null;
}

export function isLifecycleAvailable(): boolean {
  return !tableKnownMissing();
}

async function run<T>(operation: () => Promise<T>, fallback: T): Promise<T> {
  if (tableKnownMissing()) return fallback;
  try {
    return await operation();
  } catch (error) {
    if (rememberMissing(error)) return fallback;
    throw error;
  }
}

export function ensureAccountState(userId: string): Promise<boolean> {
  return withInvalidation(userId, () => run(async () => {
    await prisma.$executeRaw(ensureAccountStateSql(userId));
    return true;
  }, false));
}

export function bumpSessionVersion(userId: string): Promise<boolean> {
  return withInvalidation(userId, () => run(async () => {
    await prisma.$queryRaw(bumpSessionVersionSql(userId));
    return true;
  }, false));
}

export function markEmailVerified(userId: string): Promise<boolean> {
  return withInvalidation(userId, () => run(async () => {
    await prisma.$executeRaw(markEmailVerifiedSql(userId));
    return true;
  }, false));
}

// Le notifiche di servizio vanno solo a indirizzi confermati; gli account
// precedenti alla verifica (legacy/unknown) continuano a riceverle.
export function emailAllowsNotifications(status: AccountSessionState["emailStatus"]): boolean {
  return status !== "unverified";
}
