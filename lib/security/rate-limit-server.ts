import { prisma } from "@/lib/prisma";
import { logOperationalEvent } from "@/lib/observability/operations";
import { consumeRateLimits, type RateLimitResult, type RateLimitRule } from "@/lib/security/rate-limit";

export async function enforceRateLimits(
  scope: string,
  checks: Array<{ rule: RateLimitRule; subject: string | null | undefined }>
): Promise<RateLimitResult> {
  const result = await consumeRateLimits(
    (query) => prisma.$queryRaw<Array<{ count: number }>>(query),
    checks,
    (_error, missingTable) => {
      logOperationalEvent("security.rate_limit_unavailable", { scope, missingTable }, missingTable ? "warn" : "error");
    }
  );
  if (!result.allowed) logOperationalEvent("security.rate_limited", { scope }, "warn");
  return result;
}
