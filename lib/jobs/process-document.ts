import { createClient } from "@supabase/supabase-js";
import { AnalysisStatus, DocumentType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { analyzeDocument } from "@/lib/ai";
import { arricchisciConFrontoMercato } from "@/lib/parsers/bolletta";
import { validateBollettaOutput, validateBustaPagaOutput } from "@/lib/ai/validate";
import { validateDocumentBuffer } from "@/lib/documents/upload-validation";

export const MAX_ANALYSIS_ATTEMPTS = 3;
export const ANALYSIS_LEASE_TIMEOUT_MS = 2 * 60 * 1000;

type JobState = {
  _job?: {
    attempts?: number;
    lastError?: string | null;
  };
};

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

function getAttempts(analysis: unknown): number {
  if (!analysis || typeof analysis !== "object" || Array.isArray(analysis)) return 0;
  const job = (analysis as JobState)._job;
  return typeof job?.attempts === "number" && Number.isInteger(job.attempts) && job.attempts >= 0
    ? job.attempts
    : 0;
}

function mapDetectedType(value: unknown): DocumentType | null {
  if (value === "luce") return DocumentType.BOLLETTA_LUCE;
  if (value === "gas") return DocumentType.BOLLETTA_GAS;
  if (value === "internet") return DocumentType.BOLLETTA_INTERNET;
  if (value === "busta_paga") return DocumentType.BUSTA_PAGA;
  return null;
}

function isUnsupportedOutput(raw: unknown): boolean {
  return typeof raw === "object" && raw !== null && !Array.isArray(raw) &&
    (raw as { tipo_rilevato?: unknown }).tipo_rilevato === "sconosciuto";
}

async function markUnsupported(documentId: string, leaseTime: Date) {
  await prisma.document.updateMany({
    where: { id: documentId, status: AnalysisStatus.PROCESSING, updatedAt: leaseTime },
    data: {
      status: AnalysisStatus.ERROR,
      analysis: {
        error: "documento_non_supportato",
        message: "Il documento caricato non sembra una bolletta o busta paga supportata. Riprova con un documento corretto.",
      },
    },
  });
}

async function markFailure(documentId: string, leaseTime: Date, attempts: number, message: string) {
  const exhausted = attempts >= MAX_ANALYSIS_ATTEMPTS;
  await prisma.document.updateMany({
    where: { id: documentId, status: AnalysisStatus.PROCESSING, updatedAt: leaseTime },
    data: {
      status: exhausted ? AnalysisStatus.ERROR : AnalysisStatus.PENDING,
      analysis: exhausted
        ? { errore: message, _job: { attempts, lastError: message.slice(0, 1000) } }
        : { _job: { attempts, lastError: message.slice(0, 1000) } },
    },
  });
}

export async function processDocumentAnalysis(documentId: string): Promise<boolean> {
  const current = await prisma.document.findUnique({
    where: { id: documentId },
    select: {
      id: true,
      type: true,
      filePath: true,
      status: true,
      analysis: true,
      updatedAt: true,
      deletedAt: true,
    },
  });

  if (!current || current.deletedAt || !current.filePath) return false;
  if (current.status !== AnalysisStatus.PENDING && current.status !== AnalysisStatus.PROCESSING) return false;

  const staleBefore = Date.now() - ANALYSIS_LEASE_TIMEOUT_MS;
  if (current.status === AnalysisStatus.PROCESSING && current.updatedAt.getTime() >= staleBefore) return false;

  const attempts = getAttempts(current.analysis);
  if (attempts >= MAX_ANALYSIS_ATTEMPTS) return false;

  const nextAttempt = attempts + 1;
  const leaseTime = new Date();
  const claim = await prisma.document.updateMany({
    where: {
      id: current.id,
      status: current.status,
      updatedAt: current.updatedAt,
      deletedAt: null,
    },
    data: {
      status: AnalysisStatus.PROCESSING,
      updatedAt: leaseTime,
      analysis: { _job: { attempts: nextAttempt, lastError: null } },
    },
  });

  if (claim.count === 0) return false;

  try {
    const { data, error } = await getSupabase().storage.from("documents").download(current.filePath);
    if (error || !data) throw new Error(`Download documento fallito: ${error?.message ?? "file non disponibile"}`);

    const buffer = Buffer.from(await data.arrayBuffer());
    const mimeType = validateDocumentBuffer(buffer);
    const fileBase64 = buffer.toString("base64");
    const isPayroll = current.type === DocumentType.BUSTA_PAGA;

    const { raw } = await analyzeDocument({
      fileBase64,
      mimeType,
      documentType: current.type,
    });

    if (isUnsupportedOutput(raw)) {
      await markUnsupported(documentId, leaseTime);
      return true;
    }

    if (isPayroll) {
      const validated = validateBustaPagaOutput(raw);
      const effectiveType = mapDetectedType(validated.tipo_rilevato);
      if (!effectiveType) throw new Error("Tipo documento AI non riconosciuto.");

      await prisma.document.updateMany({
        where: { id: documentId, status: AnalysisStatus.PROCESSING, updatedAt: leaseTime },
        data: {
          type: effectiveType,
          typeCorrected: effectiveType !== current.type,
          typeSelectedByUser: effectiveType !== current.type ? current.type : null,
          status: AnalysisStatus.DONE,
          rawExtracted: validated,
          analysis: validated,
        },
      });
      return true;
    }

    const validated = validateBollettaOutput(raw);
    const effectiveType = mapDetectedType(validated.tipo_rilevato);
    if (!effectiveType) throw new Error("Tipo documento AI non riconosciuto.");
    const analysis = await arricchisciConFrontoMercato(validated);

    await prisma.document.updateMany({
      where: { id: documentId, status: AnalysisStatus.PROCESSING, updatedAt: leaseTime },
      data: {
        type: effectiveType,
        typeCorrected: effectiveType !== current.type,
        typeSelectedByUser: effectiveType !== current.type ? current.type : null,
        status: AnalysisStatus.DONE,
        rawExtracted: validated,
        analysis,
      },
    });
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Errore sconosciuto durante l'analisi.";
    await markFailure(documentId, leaseTime, nextAttempt, message);
    return false;
  }
}

export function shouldRecoverAnalysis(input: {
  status: AnalysisStatus;
  analysis: unknown;
  updatedAt: Date;
}): boolean {
  if (getAttempts(input.analysis) >= MAX_ANALYSIS_ATTEMPTS) return false;
  if (input.status === AnalysisStatus.PENDING) return true;
  if (input.status !== AnalysisStatus.PROCESSING) return false;
  return input.updatedAt.getTime() < Date.now() - ANALYSIS_LEASE_TIMEOUT_MS;
}
