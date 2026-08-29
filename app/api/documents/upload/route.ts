import { after, NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AnalysisStatus, DocumentType, UserPlan } from "@prisma/client";
import { ANALYSIS_LIMITS } from "@/lib/config/constants";
import { createClient } from "@supabase/supabase-js";
import { v4 as uuidv4 } from "uuid";
import {
  safeExtension,
  validateDocumentBuffer,
  type AcceptedMimeType,
} from "@/lib/documents/upload-validation";
import { processDocumentAnalysis } from "@/lib/jobs/process-document";

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
    if (tipo === "busta_paga") return DocumentType.BUSTA_PAGA;
  }
  const lower = filename.toLowerCase();
  if (lower.includes("luce") || lower.includes("energia")) return DocumentType.BOLLETTA_LUCE;
  if (lower.includes("gas")) return DocumentType.BOLLETTA_GAS;
  if (lower.includes("internet") || lower.includes("fibra")) return DocumentType.BOLLETTA_INTERNET;
  if (lower.includes("busta") || lower.includes("paga") || lower.includes("cedolino")) return DocumentType.BUSTA_PAGA;
  return DocumentType.BOLLETTA_LUCE;
}

type QuotaCheck =
  | { ok: true; plan: UserPlan }
  | { ok: false; status: 401 | 429; error: string; message?: string };

async function getUserPlanAndCheckQuota(userId: string): Promise<QuotaCheck> {
  const userRecord = await prisma.user.findUnique({
    where: { id: userId },
    select: { plan: true },
  });
  if (!userRecord) return { ok: false, status: 401, error: "user_not_found" };

  const now = new Date();
  const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const monthlyCount = await prisma.document.count({
    where: {
      userId,
      createdAt: { gte: startOfMonth },
    },
  });

  const limit = ANALYSIS_LIMITS[userRecord.plan];
  if (monthlyCount >= limit) {
    const message =
      userRecord.plan === UserPlan.FREE
        ? `Hai raggiunto il limite di ${ANALYSIS_LIMITS.FREE} analisi mensili del piano gratuito. Passa a PRO per continuare ad analizzare i tuoi documenti.`
        : `Hai raggiunto il limite di ${ANALYSIS_LIMITS.PRO} analisi mensili del piano PRO.`;
    return { ok: false, status: 429, error: "limit_reached", message };
  }

  return { ok: true, plan: userRecord.plan };
}

function scheduleAnalysis(documentId: string) {
  after(async () => {
    try {
      await processDocumentAnalysis(documentId);
    } catch (error) {
      console.error("[analysis] failed to start document analysis", documentId, error);
    }
  });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autenticato." }, { status: 401 });
  }

  const quota = await getUserPlanAndCheckQuota(session.user.id);
  if (!quota.ok) {
    if (quota.error === "limit_reached") {
      return NextResponse.json({ error: "limit_reached", message: quota.message }, { status: quota.status });
    }
    return NextResponse.json({ error: "Sessione non valida." }, { status: quota.status });
  }

  const contentType = req.headers.get("content-type") ?? "";
  let buffer: Buffer;
  let mimeType: AcceptedMimeType;
  let fileName: string;
  let tipoHint: string | null;

  try {
    if (contentType.includes("application/json")) {
      if (quota.plan !== UserPlan.PRO) {
        return NextResponse.json({ error: "Funzione disponibile solo con il piano PRO." }, { status: 403 });
      }

      const body = await req.json() as { fileBase64?: string; fileName?: string; tipo?: string };
      if (!body.fileBase64) {
        return NextResponse.json({ error: "Dati mancanti." }, { status: 400 });
      }

      buffer = Buffer.from(body.fileBase64, "base64");
      mimeType = validateDocumentBuffer(buffer, "application/pdf");
      fileName = body.fileName?.trim() || "documento.pdf";
      tipoHint = body.tipo ?? null;
    } else {
      const formData = await req.formData();
      const file = formData.get("file") as File | null;
      tipoHint = formData.get("tipo") as string | null;

      if (!file) {
        return NextResponse.json({ error: "Nessun file ricevuto." }, { status: 400 });
      }

      buffer = Buffer.from(await file.arrayBuffer());
      mimeType = validateDocumentBuffer(buffer, file.type || undefined);
      fileName = file.name || "documento";
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "File non valido.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const supabase = getSupabase();
  const storagePath = `uploads/${session.user.id}/${uuidv4()}.${safeExtension(mimeType)}`;
  const { error: uploadError } = await supabase.storage
    .from("documents")
    .upload(storagePath, buffer, { contentType: mimeType });

  if (uploadError) {
    return NextResponse.json({ error: "Errore salvataggio file." }, { status: 500 });
  }

  try {
    const document = await prisma.document.create({
      data: {
        userId: session.user.id,
        type: detectDocumentType(fileName, tipoHint ?? undefined),
        filePath: storagePath,
        fileName,
        status: AnalysisStatus.PENDING,
      },
    });

    scheduleAnalysis(document.id);
    return NextResponse.json({ id: document.id, status: "PENDING" }, { status: 202 });
  } catch (error) {
    await supabase.storage.from("documents").remove([storagePath]);
    console.error("[upload] database create failed; storage object removed", error);
    return NextResponse.json({ error: "Errore creazione documento." }, { status: 500 });
  }
}
