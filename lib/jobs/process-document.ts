import { createClient } from "@supabase/supabase-js";
import { AnalysisStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { analyzeDocument } from "@/lib/ai";
import { arricchisciConFrontoMercato } from "@/lib/parsers/bolletta";
import { verificaBustaPaga } from "@/lib/parsers/bustapaga";
import { validateBollettaOutput, validateBustaPagaOutput } from "@/lib/ai/validate";
import { validateDocumentBuffer, type AcceptedMimeType } from "@/lib/documents/upload-validation";
import { elapsedMs, logOperationalEvent, toSafeErrorMessage } from "@/lib/observability/operations";
import type { BollettaRaw } from "@/types/bolletta";
import type { BustaPagaData } from "@/types/bustapaga";
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
    if (result.count > 0) {
      logOperationalEvent("analysis.claimed", {
        documentId: document.id,
        attempt,
        previousStatus: document.status,
      });
    }
    return result.count > 0;
  },

  async complete(input) {
    const result = await prisma.document.updateMany({
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
    if (result.count > 0) {
      logOperationalEvent("analysis.completed", {
        documentId: input.documentId,
        type: input.type,
        typeCorrected: input.typeCorrected,
      });
    }
  },

  async markUnsupported({ documentId, leaseTime }) {
    const result = await prisma.document.updateMany({
      where: { id: documentId, status: AnalysisStatus.PROCESSING, updatedAt: leaseTime },
      data: {
        status: AnalysisStatus.ERROR,
        analysis: {
          error: "documento_non_supportato",
          message: "Il documento caricato non sembra una bolletta o busta paga supportata. Riprova con un documento corretto.",
        },
      },
    });
    if (result.count > 0) {
      logOperationalEvent("analysis.unsupported", { documentId }, "warn");
    }
  },

  async markFailure({ documentId, leaseTime, attempts, message, exhausted }) {
    const result = await prisma.document.updateMany({
      where: { id: documentId, status: AnalysisStatus.PROCESSING, updatedAt: leaseTime },
      data: {
        status: exhausted ? AnalysisStatus.ERROR : AnalysisStatus.PENDING,
        analysis: exhausted
          ? { errore: message, _job: { attempts, lastError: message.slice(0, 1000) } }
          : { _job: { attempts, lastError: message.slice(0, 1000) } },
      },
    });
    if (result.count > 0) {
      logOperationalEvent("analysis.failed", {
        documentId,
        attempts,
        exhausted,
        error: message.slice(0, 500),
      }, exhausted ? "error" : "warn");
    }
  },
};

export const processDocumentAnalysis = createDocumentAnalysisProcessor({
  store,
  async download(filePath) {
    const startedAt = Date.now();
    const { data, error } = await getSupabase().storage.from("documents").download(filePath);
    if (error || !data) {
      logOperationalEvent("storage.document_download_failed", {
        durationMs: elapsedMs(startedAt),
        error: error?.message ?? "file non disponibile",
      }, "error");
      throw new Error(`Download documento fallito: ${error?.message ?? "file non disponibile"}`);
    }
    logOperationalEvent("storage.document_download_completed", { durationMs: elapsedMs(startedAt) });
    return Buffer.from(await data.arrayBuffer());
  },
  validateBuffer: validateDocumentBuffer,
  async analyze(input) {
    const startedAt = Date.now();
    try {
      const result = await analyzeDocument({
        ...input,
        mimeType: input.mimeType as AcceptedMimeType,
      });
      logOperationalEvent("ai.analysis_completed", {
        provider: result.provider,
        documentTypeHint: input.documentType,
        durationMs: elapsedMs(startedAt),
      });
      return result;
    } catch (error) {
      logOperationalEvent("ai.analysis_failed", {
        documentTypeHint: input.documentType,
        durationMs: elapsedMs(startedAt),
        error: toSafeErrorMessage(error),
      }, "error");
      throw error;
    }
  },
  validateBill: (raw) => validateBollettaOutput(raw),
  validatePayroll: (raw) => validateBustaPagaOutput(raw),
  enrichBill: (validated) => arricchisciConFrontoMercato(validated as unknown as BollettaRaw),
  verifyPayroll: (validated) => verificaBustaPaga(validated as unknown as BustaPagaData),
});

export {
  MAX_ANALYSIS_ATTEMPTS,
  ANALYSIS_LEASE_TIMEOUT_MS,
  shouldRecoverAnalysis,
};
