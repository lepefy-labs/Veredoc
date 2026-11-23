import { ANALYSIS_LIMITS } from "../config/constants.ts";

const plans = {
  FREE: { monthlyAnalyses: ANALYSIS_LIMITS.FREE, pdfApiUpload: false },
  PRO: { monthlyAnalyses: ANALYSIS_LIMITS.PRO, pdfApiUpload: true },
} as const;

export function resolveEntitlements(value: string | undefined) {
  const plan: keyof typeof plans = value === "PRO" ? "PRO" : "FREE";
  return { plan, ...plans[plan] };
}
