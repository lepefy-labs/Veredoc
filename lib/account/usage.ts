import { prisma } from "@/lib/prisma";
import { resolveEntitlements } from "@/lib/account/entitlements";

// Stessa regola del controllo quota all'upload (app/api/documents/upload/route.ts).
export function startOfCurrentMonthUtc(now = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

export async function getMonthlyUsage(userId: string, plan: string | undefined) {
  const entitlements = resolveEntitlements(plan);
  const used = await prisma.document.count({
    where: { userId, createdAt: { gte: startOfCurrentMonthUtc() } },
  });
  return { plan: entitlements.plan, used, limit: entitlements.monthlyAnalyses };
}
