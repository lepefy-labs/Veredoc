// POST /api/jobs/refresh-market-rates
// Protetto da Authorization: Bearer <JOBS_SECRET>
// Aggiorna analysis su tutti i documenti DONE di tipo bolletta
// Eseguito da n8n ogni notte dopo lo scraping tariffe

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { arricchisciConFrontoMercato } from "@/lib/parsers/bolletta";
import { elapsedMs, logOperationalEvent } from "@/lib/observability/operations";
import { isJobRequestAuthorized } from "@/lib/security/access";
import { AnalysisStatus, DocumentType } from "@prisma/client";
import type { BollettaRaw } from "@/types/bolletta";

export async function POST(req: NextRequest) {
  if (!isJobRequestAuthorized(req.headers.get("authorization"))) {
    return NextResponse.json({ error: "Non autorizzato." }, { status: 401 });
  }

  const startedAt = Date.now();
  const documents = await prisma.document.findMany({
    where: {
      status: AnalysisStatus.DONE,
      type: { in: [DocumentType.BOLLETTA_LUCE, DocumentType.BOLLETTA_GAS, DocumentType.BOLLETTA_INTERNET] },
      deletedAt: null,
    },
    select: { id: true, rawExtracted: true },
  });

  let updated = 0;
  let skippedMissingRaw = 0;
  const errors: string[] = [];

  for (const doc of documents) {
    if (!doc.rawExtracted) {
      skippedMissingRaw += 1;
      continue;
    }
    try {
      const rawExtracted = doc.rawExtracted as unknown as BollettaRaw;
      const analysis = await arricchisciConFrontoMercato(rawExtracted);
      await prisma.document.update({
        where: { id: doc.id },
        data: { analysis: analysis as object },
      });
      updated++;
    } catch (err) {
      errors.push(`${doc.id}: ${err instanceof Error ? err.message : "Errore"}`);
    }
  }

  const durationMs = elapsedMs(startedAt);
  logOperationalEvent("job.refresh_market_rates.completed", {
    documents: documents.length,
    updated,
    skippedMissingRaw,
    errors: errors.length,
    durationMs,
  }, errors.length > 0 ? "warn" : "info");

  return NextResponse.json({
    documents: documents.length,
    updated,
    skippedMissingRaw,
    errors,
    durationMs,
  });
}
