import { createHash } from "node:crypto";
import { Prisma } from "@prisma/client";

// Rate limit persistente su Postgres (tabella "RateLimitBucket", migrazione 004).
// Finestra fissa per chiave; contatore aggiornato con un unico UPSERT atomico,
// quindi corretto anche con più istanze serverless concorrenti.
// Le chiavi sono hash SHA-256: nessun indirizzo email o IP in chiaro nel database.

export interface RateLimitRule {
  name: string;
  limit: number;
  windowSeconds: number;
}

export const RATE_LIMITS = {
  loginEmail: { name: "login:email", limit: 10, windowSeconds: 15 * 60 },
  loginIp: { name: "login:ip", limit: 50, windowSeconds: 15 * 60 },
  registerIp: { name: "register:ip", limit: 5, windowSeconds: 60 * 60 },
  // Avvisi "hai già un account" verso lo stesso indirizzo.
  registerEmail: { name: "register:email", limit: 2, windowSeconds: 60 * 60 },
  forgotEmail: { name: "forgot:email", limit: 3, windowSeconds: 60 * 60 },
  forgotIp: { name: "forgot:ip", limit: 10, windowSeconds: 60 * 60 },
  resetIp: { name: "reset:ip", limit: 10, windowSeconds: 60 * 60 },
  passwordChangeUser: { name: "password:user", limit: 5, windowSeconds: 15 * 60 },
  verifyTokenIp: { name: "verify:ip", limit: 20, windowSeconds: 60 * 60 },
  verifySendUser: { name: "verify-send:user", limit: 3, windowSeconds: 60 * 60 },
  emailChangeUser: { name: "email-change:user", limit: 5, windowSeconds: 60 * 60 },
  exportUser: { name: "export:user", limit: 5, windowSeconds: 60 * 60 },
  deleteUser: { name: "delete:user", limit: 5, windowSeconds: 15 * 60 },
} satisfies Record<string, RateLimitRule>;

export function rateLimitKey(rule: RateLimitRule, subject: string): string {
  return createHash("sha256").update(`${rule.name}:${subject}`).digest("hex");
}

export function consumeRateLimitSql(key: string, rule: RateLimitRule): Prisma.Sql {
  return Prisma.sql`
    INSERT INTO "RateLimitBucket" ("key", "windowStart", "count")
    VALUES (${key}, now(), 1)
    ON CONFLICT ("key") DO UPDATE SET
      "count" = CASE
        WHEN "RateLimitBucket"."windowStart" <= now() - make_interval(secs => ${rule.windowSeconds}) THEN 1
        ELSE "RateLimitBucket"."count" + 1
      END,
      "windowStart" = CASE
        WHEN "RateLimitBucket"."windowStart" <= now() - make_interval(secs => ${rule.windowSeconds}) THEN now()
        ELSE "RateLimitBucket"."windowStart"
      END
    RETURNING "count"`;
}

export function purgeRateLimitsSql(olderThanSeconds = 24 * 60 * 60): Prisma.Sql {
  return Prisma.sql`
    DELETE FROM "RateLimitBucket"
    WHERE "windowStart" < now() - make_interval(secs => ${olderThanSeconds})`;
}

// Tabella non ancora creata (migrazione 004 non applicata).
export function isMissingTableError(error: unknown): boolean {
  const text = error instanceof Error ? `${error.message} ${(error as { code?: unknown }).code ?? ""}` : String(error);
  return /42P01|does not exist|P2021|relation .* does not exist/i.test(text);
}

export type QueryCount = (query: Prisma.Sql) => Promise<Array<{ count: number | bigint }>>;

export interface RateLimitResult {
  allowed: boolean;
  // false se il controllo non è stato possibile (tabella assente o DB non raggiungibile).
  enforced: boolean;
}

// Fail-open: un problema del rate limiter non deve impedire login o registrazione.
export async function consumeRateLimits(
  query: QueryCount,
  checks: Array<{ rule: RateLimitRule; subject: string | null | undefined }>,
  onError?: (error: unknown, missingTable: boolean) => void
): Promise<RateLimitResult> {
  let allowed = true;
  for (const { rule, subject } of checks) {
    if (!subject) continue;
    try {
      const rows = await query(consumeRateLimitSql(rateLimitKey(rule, subject), rule));
      if (Number(rows[0]?.count ?? 0) > rule.limit) allowed = false;
    } catch (error) {
      onError?.(error, isMissingTableError(error));
      return { allowed: true, enforced: false };
    }
  }
  return { allowed, enforced: true };
}

// Su Vercel x-forwarded-for è impostato dalla piattaforma: il primo valore è il client.
export function clientIpFrom(headers: { get(name: string): string | null } | null | undefined): string | null {
  if (!headers) return null;
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || headers.get("x-real-ip")?.trim() || null;
}
