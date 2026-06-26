import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { analyzeDocument } from "@/lib/ai";
import { arricchisciConFrontoMercato } from "@/lib/parsers/bolletta";
import { deanonymize } from "@/lib/anonymizer";
import { DocumentType, AnalysisStatus, Prisma } from "@prisma/client";

export async function POST(
  req: NextRequest,
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
  if (document.status !== AnalysisStatus.AWAITING_CONFIRMATION) {
    return NextResponse.json({ error: "Documento non in attesa di conferma." }, { status: 400 });
  }
  if (!document.anonymizedText || !document.anonymizedMap) {
    return NextResponse.json({ error: "Dati intermedi mancanti." }, { status: 500 });
  }

  const body = await req.json().catch(() => ({})) as { map?: Record<string, string> };
  const map = (body.map ?? document.anonymizedMap) as Record<string, string>;

  void runAnalysisFromAnonymized(document.id, document.type, document.anonymizedText, map);

  return NextResponse.json({ status: "PROCESSING" });
}

const TIPO_MAP: Partial<Record<string, DocumentType>> = {
  luce:       DocumentType.BOLLETTA_LUCE,
  gas:        DocumentType.BOLLETTA_GAS,
  internet:   DocumentType.BOLLETTA_INTERNET,
  busta_paga: DocumentType.BUSTA_PAGA,
};

async function runAnalysisFromAnonymized(
  documentId: string,
  docType: DocumentType,
  anonymizedText: string,
  map: Record<string, string>
) {
  await prisma.document.update({
    where: { id: documentId },
    data: { status: AnalysisStatus.PROCESSING },
  });

  try {
    const isBustaPaga = docType === DocumentType.BUSTA_PAGA;
    const dummyBase64 = Buffer.from("").toString("base64");

    if (isBustaPaga) {
      const { raw } = await analyzeDocument({
        fileBase64: dummyBase64,
        mimeType: "application/pdf",
        documentType: "BUSTA_PAGA",
        textOverride: anonymizedText,
      });
      const rawRestored = deanonymize(JSON.stringify(raw), map);
      const finalRaw = JSON.parse(rawRestored);

      const tipoRilevatoRaw = (finalRaw as Record<string, unknown>).tipo_rilevato as string | undefined;
      const tipoRilevato = tipoRilevatoRaw ? TIPO_MAP[tipoRilevatoRaw] : undefined;
      const typeChanged = tipoRilevato !== undefined && tipoRilevato !== docType;
      if (typeChanged) {
        await prisma.document.update({
          where: { id: documentId },
          data: { type: tipoRilevato, typeCorrected: true, typeSelectedByUser: docType },
        });
      }

      await prisma.document.update({
        where: { id: documentId },
        data: {
          status: AnalysisStatus.DONE,
          rawExtracted: finalRaw as object,
          analysis: finalRaw as object,
          anonymizedText: null,
          anonymizedMap: Prisma.JsonNull,
        },
      });
    } else {
      const docTypeKey = docType as "BOLLETTA_LUCE" | "BOLLETTA_GAS" | "BOLLETTA_INTERNET";
      const { raw } = await analyzeDocument({
        fileBase64: dummyBase64,
        mimeType: "application/pdf",
        documentType: docTypeKey,
        textOverride: anonymizedText,
      });
      const rawRestored = deanonymize(JSON.stringify(raw), map);
      const finalRaw = JSON.parse(rawRestored);

      const tipoRilevatoRaw = (finalRaw as Record<string, unknown>).tipo_rilevato as string | undefined;
      const tipoRilevato = tipoRilevatoRaw ? TIPO_MAP[tipoRilevatoRaw] : undefined;
      const typeChanged = tipoRilevato !== undefined && tipoRilevato !== docType;
      if (typeChanged) {
        await prisma.document.update({
          where: { id: documentId },
          data: { type: tipoRilevato, typeCorrected: true, typeSelectedByUser: docType },
        });
      }

      const effectiveDocType = (typeChanged && tipoRilevato ? tipoRilevato : docType) as "BOLLETTA_LUCE" | "BOLLETTA_GAS" | "BOLLETTA_INTERNET" | "BUSTA_PAGA";
      const analysis = effectiveDocType !== DocumentType.BUSTA_PAGA
        ? await arricchisciConFrontoMercato(finalRaw as Parameters<typeof arricchisciConFrontoMercato>[0])
        : finalRaw;

      await prisma.document.update({
        where: { id: documentId },
        data: {
          status: AnalysisStatus.DONE,
          rawExtracted: finalRaw as object,
          analysis: analysis as object,
          anonymizedText: null,
          anonymizedMap: Prisma.JsonNull,
        },
      });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Errore sconosciuto";
    await prisma.document.update({
      where: { id: documentId },
      data: { status: AnalysisStatus.ERROR, analysis: { errore: message } as object },
    });
  }
}
