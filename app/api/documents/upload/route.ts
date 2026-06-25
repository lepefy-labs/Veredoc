import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { analyzeDocument } from "@/lib/ai";
import { arricchisciConFrontoMercato } from "@/lib/parsers/bolletta";
import { DocumentType, AnalysisStatus } from "@prisma/client";
import { MAX_FILE_SIZE_BYTES, ACCEPTED_FILE_TYPES } from "@/lib/config/constants";
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

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const tipoHint = formData.get("tipo") as string | null;

  if (!file) {
    return NextResponse.json({ error: "Nessun file ricevuto." }, { status: 400 });
  }

  if (!ACCEPTED_FILE_TYPES.includes(file.type)) {
    return NextResponse.json({ error: "Tipo file non supportato. Usa PDF, JPG o PNG." }, { status: 400 });
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return NextResponse.json({ error: "File troppo grande. Massimo 10MB." }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const ext = file.name.split(".").pop() ?? "pdf";
  const uuid = uuidv4();
  const storagePath = `uploads/${session.user.id}/${uuid}.${ext}`;

  const supabase = getSupabase();
  const { error: uploadError } = await supabase.storage
    .from("documents")
    .upload(storagePath, buffer, { contentType: file.type });

  if (uploadError) {
    return NextResponse.json({ error: "Errore salvataggio file." }, { status: 500 });
  }

  const docType = detectDocumentType(file.name, tipoHint ?? undefined);

  const document = await prisma.document.create({
    data: {
      userId: session.user.id,
      type: docType,
      filePath: storagePath,
      fileName: file.name,
      status: AnalysisStatus.PENDING,
    },
  });

  // Analisi asincrona — non blocca la risposta
  void runAnalysis(document.id, docType, buffer, file.type);

  return NextResponse.json({ id: document.id, status: "PENDING" }, { status: 202 });
}

async function runAnalysis(
  documentId: string,
  docType: DocumentType,
  buffer: Buffer,
  mimeType: string
) {
  await prisma.document.update({
    where: { id: documentId },
    data: { status: AnalysisStatus.PROCESSING },
  });

  try {
    const isBustaPaga = docType === DocumentType.BUSTA_PAGA;
    const fileBase64 = buffer.toString("base64");
    const aiMimeType = mimeType as 'application/pdf' | 'image/jpeg' | 'image/png';

    if (isBustaPaga) {
      const { raw } = await analyzeDocument({ fileBase64, mimeType: aiMimeType, documentType: "BUSTA_PAGA" });
      await prisma.document.update({
        where: { id: documentId },
        data: {
          status: AnalysisStatus.DONE,
          rawExtracted: raw as object,
          analysis: raw as object,
        },
      });
    } else {
      const docTypeKey = docType as 'BOLLETTA_LUCE' | 'BOLLETTA_GAS' | 'BOLLETTA_INTERNET';
      const { raw } = await analyzeDocument({ fileBase64, mimeType: aiMimeType, documentType: docTypeKey });
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
