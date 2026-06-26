// POST /api/jobs/refresh-market-rates
// Protetto da Authorization: Bearer <JOBS_SECRET>
// Aggiorna analysis su tutti i documenti DONE di tipo bolletta
// Eseguito da n8n ogni notte dopo lo scraping tariffe

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { arricchisciConFrontoMercato } from "@/lib/parsers/bolletta";
import { AnalysisStatus, DocumentType } from "@prisma/client";

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("Authorization");
  if (authHeader !== `Bearer ${process.env.JOBS_SECRET}`) {
    return NextResponse.json({ error: "Non autorizzato." }, { status: 401 });
  }

  const documents = await prisma.document.findMany({
    where: {
      status: AnalysisStatus.DONE,
      type: { in: [DocumentType.BOLLETTA_LUCE, DocumentType.BOLLETTA_GAS, DocumentType.BOLLETTA_INTERNET] },
      deletedAt: null,
    },
    select: { id: true, rawExtracted: true },
  });

  let updated = 0;
  const errors: string[] = [];

  for (const doc of documents) {
    if (!doc.rawExtracted) continue;
    try {
      const analysis = await arricchisciConFrontoMercato(doc.rawExtracted as any);
      await prisma.document.update({
        where: { id: doc.id },
        data: { analysis: analysis as object },
      });
      updated++;
    } catch (err) {
      errors.push(`${doc.id}: ${err instanceof Error ? err.message : "Errore"}`);
    }
  }

  return NextResponse.json({ updated, errors });
}
