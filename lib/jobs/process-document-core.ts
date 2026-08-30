import { AnalysisStatus, DocumentType } from "@prisma/client";

export const MAX_ANALYSIS_ATTEMPTS = 3;
export const ANALYSIS_LEASE_TIMEOUT_MS = 2 * 60 * 1000;

type JobState = {
  _job?: {
    attempts?: number;
    lastError?: string | null;
  };
};

export interface ProcessableDocument {
  id: string;
  type: DocumentType;
  filePath: string | null;
  status: AnalysisStatus;
  analysis: unknown;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface DocumentAnalysisStore {
  findById(documentId: string): Promise<ProcessableDocument | null>;
  claim(input: {
    document: ProcessableDocument;
    leaseTime: Date;
    attempt: number;
  }): Promise<boolean>;
  complete(input: {
    documentId: string;
    leaseTime: Date;
    type: DocumentType;
    typeCorrected: boolean;
    typeSelectedByUser: DocumentType | null;
    rawExtracted: unknown;
    analysis: unknown;
  }): Promise<void>;
  markUnsupported(input: { documentId: string; leaseTime: Date }): Promise<void>;
  markFailure(input: {
    documentId: string;
    leaseTime: Date;
    attempts: number;
    message: string;
    exhausted: boolean;
  }): Promise<void>;
}

interface ValidatedDocument {
  tipo_rilevato: unknown;
  [key: string]: unknown;
}

export interface DocumentAnalysisDependencies {
  store: DocumentAnalysisStore;
  download(filePath: string): Promise<Buffer>;
  validateBuffer(buffer: Buffer): string;
  analyze(input: {
    fileBase64: string;
    mimeType: string;
    documentType: DocumentType;
  }): Promise<{ raw: unknown }>;
  validateBill(raw: unknown): ValidatedDocument;
  validatePayroll(raw: unknown): ValidatedDocument;
  enrichBill(validated: ValidatedDocument): Promise<unknown>;
  now?: () => Date;
}

export function getAnalysisAttempts(analysis: unknown): number {
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

export function shouldRecoverAnalysis(
  input: { status: AnalysisStatus; analysis: unknown; updatedAt: Date },
  nowMs = Date.now()
): boolean {
  if (getAnalysisAttempts(input.analysis) >= MAX_ANALYSIS_ATTEMPTS) return false;
  if (input.status === AnalysisStatus.PENDING) return true;
  if (input.status !== AnalysisStatus.PROCESSING) return false;
  return input.updatedAt.getTime() < nowMs - ANALYSIS_LEASE_TIMEOUT_MS;
}

export function createDocumentAnalysisProcessor(deps: DocumentAnalysisDependencies) {
  return async function processDocumentAnalysis(documentId: string): Promise<boolean> {
    const current = await deps.store.findById(documentId);

    if (!current || current.deletedAt || !current.filePath) return false;
    if (current.status !== AnalysisStatus.PENDING && current.status !== AnalysisStatus.PROCESSING) return false;

    const now = deps.now?.() ?? new Date();
    const staleBefore = now.getTime() - ANALYSIS_LEASE_TIMEOUT_MS;
    if (current.status === AnalysisStatus.PROCESSING && current.updatedAt.getTime() >= staleBefore) return false;

    const attempts = getAnalysisAttempts(current.analysis);
    if (attempts >= MAX_ANALYSIS_ATTEMPTS) return false;

    const nextAttempt = attempts + 1;
    const leaseTime = now;
    const claimed = await deps.store.claim({ document: current, leaseTime, attempt: nextAttempt });
    if (!claimed) return false;

    try {
      const buffer = await deps.download(current.filePath);
      const mimeType = deps.validateBuffer(buffer);
      const fileBase64 = buffer.toString("base64");
      const isPayroll = current.type === DocumentType.BUSTA_PAGA;

      const { raw } = await deps.analyze({
        fileBase64,
        mimeType,
        documentType: current.type,
      });

      if (isUnsupportedOutput(raw)) {
        await deps.store.markUnsupported({ documentId, leaseTime });
        return true;
      }

      const validated = isPayroll ? deps.validatePayroll(raw) : deps.validateBill(raw);
      const effectiveType = mapDetectedType(validated.tipo_rilevato);
      if (!effectiveType) throw new Error("Tipo documento AI non riconosciuto.");

      const analysis = isPayroll ? validated : await deps.enrichBill(validated);

      await deps.store.complete({
        documentId,
        leaseTime,
        type: effectiveType,
        typeCorrected: effectiveType !== current.type,
        typeSelectedByUser: effectiveType !== current.type ? current.type : null,
        rawExtracted: validated,
        analysis,
      });
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Errore sconosciuto durante l'analisi.";
      const exhausted = nextAttempt >= MAX_ANALYSIS_ATTEMPTS;
      await deps.store.markFailure({
        documentId,
        leaseTime,
        attempts: nextAttempt,
        message,
        exhausted,
      });
      return false;
    }
  };
}
