import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { analyzeDocument } from "@/lib/ai";
import { arricchisciConFrontoMercato } from "@/lib/parsers/bolletta";
import { DocumentType, AnalysisStatus, UserPlan } from "@prisma/client";
import { ANALYSIS_LIMITS } from "@/lib/config/constants";
import { createClient } from "@supabase/supabase-js";
import { v4 as uuidv4 } from "uuid";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

function detectDocumentType(filename: string, tipo?: string): DocumentType {
  if (tipo) {
    if (tipo === "luce") return DocumentType.BOLLETTA_LUCE;
    if (tipo === "gas") return DocumentType.BOLLETTA_GAS;
    if (tipo === "internet" || tipo === "telefonia") return DocumentType.BOLLETTA_INTERNET;
  }
  const lower = filename.toLowerCase();
  if (lower.includes("luce") || lower.includes("energia")) return DocumentType.BOLLETTA_LUCE;
  if (lower.includes("gas")) return DocumentType.BOLLETTA_GAS;
  if (lower.includes("internet") || lower.includes("fibra")) return DocumentType.BOLLETTA_INTERNET;
  if (lower.includes("busta") || lower.includes("paga") || lower.includes("cedolino")) return DocumentType.BUSTA_PAGA;
  return DocumentType.BOLLETTA_LUCE;
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autenticato." }, { status: 401 });
  }

  const { fileBase64, mimeType, fileName, tipo } = await req.json() as {
    fileBase64: string;
    mimeType: string;
    fileName: string;
    tipo?: string;
  };

  if (!fileBase64 || !fileName) {
    return NextResponse.json({ error: "Dati mancanti." }, { status: 400 });
  }

  const docType = detectDocumentType(fileName, tipo);

  const supabase = getSupabase();
  const uuid = uuidv4();
  const storagePath = `uploads/${session.user.id}/${uuid}.pdf`;
  const pdfBuffer = Buffer.from(fileBase64, "base64");

  const { error: uploadError } = await supabase.storage
    .from("documents")
    .upload(storagePath, pdfBuffer, { contentType: "application/pdf" });

  if (uploadError) {
    return NextResponse.json({ error: "Errore salvataggio file." }, { status: 500 });
  }

  const userRecord = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { plan: true },
  });
  const userPlan = userRecord?.plan ?? UserPlan.FREE;

  const startOfMonth = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1));
  const monthlyCount = await prisma.document.count({
    where: {
      userId: session.user.id,
      status: { in: [AnalysisStatus.DONE, AnalysisStatus.ERROR, AnalysisStatus.DELETED] },
      createdAt: { gte: startOfMonth },
    },
  });

  const limit = ANALYSIS_LIMITS[userPlan];
  if (monthlyCount >= limit) {
    const message =
      userPlan === UserPlan.FREE
        ? `Hai raggiunto il limite di ${ANALYSIS_LIMITS.FREE} analisi mensili del piano gratuito. Passa a PRO per continuare ad analizzare i tuoi documenti.`
        : `Hai raggiunto il limite di ${ANALYSIS_LIMITS.PRO} analisi mensili del piano PRO.`;
    return NextResponse.json({ error: "limit_reached", message }, { status: 429 });
  }

  const document = await prisma.document.create({
    data: {
      userId: session.user.id,
      type: docType,
      filePath: storagePath,
      fileName,
      status: AnalysisStatus.PENDING,
    },
  });

  void runAnalysis(document.id, docType, fileBase64);

  return NextResponse.json({ id: document.id, status: "PENDING" }, { status: 202 });
}

async function runAnalysis(documentId: string, docType: DocumentType, fileBase64: string) {
  await prisma.document.update({
    where: { id: documentId },
    data: { status: AnalysisStatus.PROCESSING },
  });

  try {
    const isBustaPaga = docType === DocumentType.BUSTA_PAGA;

    const TIPO_AI_MAP: Record<string, DocumentType> = {
      luce: DocumentType.BOLLETTA_LUCE,
      gas: DocumentType.BOLLETTA_GAS,
      internet: DocumentType.BOLLETTA_INTERNET,
      busta_paga: DocumentType.BUSTA_PAGA,
    };

    function mapTipoRilevato(v: unknown): DocumentType | null {
      if (typeof v !== "string") return null;
      return TIPO_AI_MAP[v] ?? null;
    }

    async function saveUnsupported() {
      await prisma.document.update({
        where: { id: documentId },
        data: {
          status: AnalysisStatus.ERROR,
          analysis: {
            error: "documento_non_supportato",
            message: "Il documento caricato non sembra una bolletta o busta paga supportata. Riprova con un documento corretto.",
          } as object,
        },
      });
    }

    if (isBustaPaga) {
      const { raw } = await analyzeDocument({ fileBase64, mimeType: "application/pdf", documentType: "BUSTA_PAGA" });

      const tipoRilevato = (raw as Record<string, unknown>).tipo_rilevato;
      const effectiveType = mapTipoRilevato(tipoRilevato);
      if (!effectiveType) {
        await saveUnsupported();
        return;
      }

      if (effectiveType !== docType) {
        await prisma.document.update({
          where: { id: documentId },
          data: { type: effectiveType, typeCorrected: true, typeSelectedByUser: docType },
        });
      }

      await prisma.document.update({
        where: { id: documentId },
        data: {
          status: AnalysisStatus.DONE,
          rawExtracted: raw as object,
          analysis: raw as object,
        },
      });
    } else {
      const docTypeKey = docType as "BOLLETTA_LUCE" | "BOLLETTA_GAS" | "BOLLETTA_INTERNET";
      const { raw } = await analyzeDocument({ fileBase64, mimeType: "application/pdf", documentType: docTypeKey });

      const tipoRilevato = (raw as Record<string, unknown>).tipo_rilevato;
      const effectiveType = mapTipoRilevato(tipoRilevato);
      if (!effectiveType) {
        await saveUnsupported();
        return;
      }

      if (effectiveType !== docType) {
        await prisma.document.update({
          where: { id: documentId },
          data: { type: effectiveType, typeCorrected: true, typeSelectedByUser: docType },
        });
      }

      const analysis = await arricchisciConFrontoMercato(raw as Parameters<typeof arricchisciConFrontoMercato>[0]);
      await prisma.document.update({
        where: { id: documentId },
        data: {
          status: AnalysisStatus.DONE,
          rawExtracted: raw as object,
          analysis: analysis as object,
        },
      });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Errore sconosciuto";
    await prisma.document.update({
      where: { id: documentId },
      data: {
        status: AnalysisStatus.ERROR,
        analysis: { errore: message } as object,
      },
    });
  }
}
