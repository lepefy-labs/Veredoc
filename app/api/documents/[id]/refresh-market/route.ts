// POST /api/documents/[id]/refresh-market
// Autenticato: solo il proprietario può aggiornare
// Solo per documenti DONE di tipo bolletta
// Zero chiamate AI — usa rawExtracted già salvato

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { arricchisciConFrontoMercato } from "@/lib/parsers/bolletta";
import { AnalysisStatus, DocumentType } from "@prisma/client";

const BOLLETTA_TYPES = [
  DocumentType.BOLLETTA_LUCE,
  DocumentType.BOLLETTA_GAS,
  DocumentType.BOLLETTA_INTERNET,
];

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autenticato." }, { status: 401 });
  }

  const { id } = await params;
  const document = await prisma.document.findUnique({ where: { id } });

  if (!document) {
    return NextResponse.json({ error: "Documento non trovato." }, { status: 404 });
  }
  if (document.userId !== session.user.id) {
    return NextResponse.json({ error: "Non autorizzato." }, { status: 403 });
  }
  if (document.status !== AnalysisStatus.DONE) {
    return NextResponse.json({ error: "Il documento non è ancora analizzato." }, { status: 400 });
  }
  if (!BOLLETTA_TYPES.includes(document.type)) {
    return NextResponse.json({ error: "Il confronto mercato è disponibile solo per le bollette." }, { status: 400 });
  }
  if (!document.rawExtracted) {
    return NextResponse.json({ error: "Dati grezzi non disponibili per questo documento." }, { status: 400 });
  }

  // Nessuna chiamata AI — usa i dati già estratti
  const analysis = await arricchisciConFrontoMercato(document.rawExtracted as any);

  await prisma.document.update({
    where: { id },
    data: { analysis: analysis as object },
    // rawExtracted rimane intatto — non viene mai modificato dopo l'analisi iniziale
  });

  return NextResponse.json({ analysis });
}
