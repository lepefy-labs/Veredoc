import { NextRequest, NextResponse } from "next/server";
import { AnalysisStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  ANALYSIS_LEASE_TIMEOUT_MS,
  processDocumentAnalysis,
  shouldRecoverAnalysis,
} from "@/lib/jobs/process-document";
import { isJobRequestAuthorized } from "@/lib/security/access";

export async function POST(req: NextRequest) {
  if (!isJobRequestAuthorized(req.headers.get("authorization"))) {
    return NextResponse.json({ error: "Non autorizzato." }, { status: 401 });
  }

  const staleBefore = new Date(Date.now() - ANALYSIS_LEASE_TIMEOUT_MS);
  const candidates = await prisma.document.findMany({
    where: {
      deletedAt: null,
      filePath: { not: null },
      OR: [
        { status: AnalysisStatus.PENDING },
        { status: AnalysisStatus.PROCESSING, updatedAt: { lt: staleBefore } },
      ],
    },
    select: { id: true, status: true, analysis: true, updatedAt: true },
    orderBy: { updatedAt: "asc" },
    take: 20,
  });

  let attempted = 0;
  let claimed = 0;
  for (const candidate of candidates) {
    if (!shouldRecoverAnalysis(candidate)) continue;
    attempted += 1;
    if (await processDocumentAnalysis(candidate.id)) claimed += 1;
    if (attempted >= 10) break;
  }

  return NextResponse.json({ success: true, attempted, claimed });
}
