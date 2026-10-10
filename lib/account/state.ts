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

export async function getAccountSessionState(userId: string): Promise<AccountSessionState | null> {
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
  return run(async () => {
    await prisma.$executeRaw(ensureAccountStateSql(userId));
    return true;
  }, false);
}

export function bumpSessionVersion(userId: string): Promise<boolean> {
  return run(async () => {
    await prisma.$queryRaw(bumpSessionVersionSql(userId));
    return true;
  }, false);
}

export function markEmailVerified(userId: string): Promise<boolean> {
  return run(async () => {
    await prisma.$executeRaw(markEmailVerifiedSql(userId));
    return true;
  }, false);
}

// Le notifiche di servizio vanno solo a indirizzi confermati; gli account
// precedenti alla verifica (legacy/unknown) continuano a riceverle.
export function emailAllowsNotifications(status: AccountSessionState["emailStatus"]): boolean {
  return status !== "unverified";
}
