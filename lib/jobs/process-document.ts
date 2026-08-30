import { createClient } from "@supabase/supabase-js";
import { AnalysisStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { analyzeDocument } from "@/lib/ai";
import { arricchisciConFrontoMercato } from "@/lib/parsers/bolletta";
import { validateBollettaOutput, validateBustaPagaOutput } from "@/lib/ai/validate";
import { validateDocumentBuffer } from "@/lib/documents/upload-validation";
import type { BollettaRaw } from "@/types/bolletta";
import {
  createDocumentAnalysisProcessor,
  MAX_ANALYSIS_ATTEMPTS,
  ANALYSIS_LEASE_TIMEOUT_MS,
  shouldRecoverAnalysis,
  type DocumentAnalysisStore,
} from "@/lib/jobs/process-document-core";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

const store: DocumentAnalysisStore = {
  async findById(documentId) {
    return prisma.document.findUnique({
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
  },

  async claim({ document, leaseTime, attempt }) {
    const result = await prisma.document.updateMany({
      where: {
        id: document.id,
        status: document.status,
        updatedAt: document.updatedAt,
        deletedAt: null,
      },
      data: {
        status: AnalysisStatus.PROCESSING,
        updatedAt: leaseTime,
        analysis: { _job: { attempts: attempt, lastError: null } },
      },
    });
    return result.count > 0;
  },

  async complete(input) {
    await prisma.document.updateMany({
      where: {
        id: input.documentId,
        status: AnalysisStatus.PROCESSING,
        updatedAt: input.leaseTime,
      },
      data: {
        type: input.type,
        typeCorrected: input.typeCorrected,
        typeSelectedByUser: input.typeSelectedByUser,
        status: AnalysisStatus.DONE,
        rawExtracted: input.rawExtracted as Prisma.InputJsonValue,
        analysis: input.analysis as Prisma.InputJsonValue,
      },
    });
  },

  async markUnsupported({ documentId, leaseTime }) {
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
  },

  async markFailure({ documentId, leaseTime, attempts, message, exhausted }) {
    await prisma.document.updateMany({
      where: { id: documentId, status: AnalysisStatus.PROCESSING, updatedAt: leaseTime },
      data: {
        status: exhausted ? AnalysisStatus.ERROR : AnalysisStatus.PENDING,
        analysis: exhausted
          ? { errore: message, _job: { attempts, lastError: message.slice(0, 1000) } }
          : { _job: { attempts, lastError: message.slice(0, 1000) } },
      },
    });
  },
};

export const processDocumentAnalysis = createDocumentAnalysisProcessor({
  store,
  async download(filePath) {
    const { data, error } = await getSupabase().storage.from("documents").download(filePath);
    if (error || !data) {
      throw new Error(`Download documento fallito: ${error?.message ?? "file non disponibile"}`);
    }
    return Buffer.from(await data.arrayBuffer());
  },
  validateBuffer: validateDocumentBuffer,
  analyze: analyzeDocument,
  validateBill: (raw) => validateBollettaOutput(raw),
  validatePayroll: (raw) => validateBustaPagaOutput(raw),
  enrichBill: (validated) => arricchisciConFrontoMercato(validated as unknown as BollettaRaw),
});

export {
  MAX_ANALYSIS_ATTEMPTS,
  ANALYSIS_LEASE_TIMEOUT_MS,
  shouldRecoverAnalysis,
};
