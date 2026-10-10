import { createClient } from "@supabase/supabase-js";
import { prisma } from "@/lib/prisma";
import { analyzeDocument } from "@/lib/ai";
import { arricchisciConFrontoMercato } from "@/lib/parsers/bolletta";
import { verificaBustaPaga } from "@/lib/parsers/bustapaga";
import { validateBollettaOutput, validateBustaPagaOutput } from "@/lib/ai/validate";
import { validateDocumentBuffer, type AcceptedMimeType } from "@/lib/documents/upload-validation";
import { logOperationalEvent } from "@/lib/observability/operations";
import type { BollettaRaw } from "@/types/bolletta";
import type { BustaPagaData } from "@/types/bustapaga";
import {
  claimAnalysisSql,
  completeAnalysisSql,
  exhaustAnalysisSql,
  releaseAnalysisSql,
  saveExtractionSql,
} from "@/lib/jobs/analysis-sql";
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
        rawExtracted: true,
        updatedAt: true,
        deletedAt: true,
      },
    });
  },
  claim: (input) => prisma.$executeRaw(claimAnalysisSql({ ...input, job: { ...input.job } })),
  saveExtraction: (input) => prisma.$executeRaw(saveExtractionSql({ ...input, job: { ...input.job } })),
  complete: (input) => prisma.$executeRaw(completeAnalysisSql(input)),
  release: (input) => prisma.$executeRaw(releaseAnalysisSql(input)),
  exhaust: (input) => prisma.$executeRaw(exhaustAnalysisSql(input)),
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
  analyze: (input) => analyzeDocument({
    ...input,
    mimeType: input.mimeType as AcceptedMimeType,
  }),
  validateBill: (raw) => validateBollettaOutput(raw),
  validatePayroll: (raw) => validateBustaPagaOutput(raw),
  enrichBill: (validated) => arricchisciConFrontoMercato(validated as unknown as BollettaRaw),
  verifyPayroll: (validated) => verificaBustaPaga(validated as unknown as BustaPagaData),
  log: logOperationalEvent,
});

export {
  MAX_ANALYSIS_ATTEMPTS,
  ANALYSIS_LEASE_TIMEOUT_MS,
  shouldRecoverAnalysis,
};
