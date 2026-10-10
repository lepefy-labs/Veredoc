import { UserPlan } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ANALYSIS_LIMITS } from "@/lib/config/constants";

// Stessa regola del controllo quota all'upload (app/api/documents/upload/route.ts).
export function startOfCurrentMonthUtc(now = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

export async function getMonthlyUsage(userId: string, plan: UserPlan | string | undefined) {
  const normalizedPlan = plan === UserPlan.PRO ? UserPlan.PRO : UserPlan.FREE;
  const used = await prisma.document.count({
    where: { userId, createdAt: { gte: startOfCurrentMonthUtc() } },
  });
  return { plan: normalizedPlan, used, limit: ANALYSIS_LIMITS[normalizedPlan] };
}
