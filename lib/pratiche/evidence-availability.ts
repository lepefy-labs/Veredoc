import "server-only";
import { prisma } from "@/lib/prisma";

export async function caseEvidenceSchemaReady() {
  const [result] = await prisma.$queryRaw<{ ready: boolean }[]>`
    SELECT EXISTS (
      SELECT 1 FROM pg_class
       WHERE oid = to_regclass('public."CaseDocument"') AND relrowsecurity
    ) AND EXISTS (
      SELECT 1 FROM pg_trigger
       WHERE tgrelid = to_regclass('public."CaseDocument"')
         AND tgname = 'CaseDocument_guard' AND tgenabled IN ('O', 'A')
    ) AS ready
  `;
  return result?.ready === true;
}

export async function caseEvidenceEnabled(userId: string) {
  if (process.env.CASE_EVIDENCE_ENABLED !== "true") return false;
  const testers = process.env.CASE_EVIDENCE_TESTER_IDS?.split(",").map((id) => id.trim()).filter(Boolean);
  if (testers?.length && !testers.includes(userId)) return false;
  return caseEvidenceSchemaReady();
}
