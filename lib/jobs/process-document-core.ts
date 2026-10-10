import { AnalysisStatus, DocumentType } from "@prisma/client";

export const MAX_ANALYSIS_ATTEMPTS = 3;
// Deve superare la durata massima delle funzioni che eseguono il worker (maxDuration = 300 s):
// un worker ancora vivo non perde mai il lease, uno interrotto viene recuperato dopo la scadenza.
export const ANALYSIS_LEASE_TIMEOUT_MS = 6 * 60 * 1000;
export const MAX_MANUAL_RETRIES = 2;

export const UNSUPPORTED_DOCUMENT_ERROR = "documento_non_supportato";
const UNSUPPORTED_DOCUMENT_MESSAGE =
  "Il documento caricato non sembra una bolletta o busta paga supportata. Riprova con un documento corretto.";
const FAILED_DOCUMENT_MESSAGE =
  "Non siamo riusciti a completare l'analisi del documento.";

export type AnalysisPhase =
  | "claim"
  | "download"
  | "file_validation"
  | "ai"
  | "validation"
  | "checkpoint"
  | "enrichment"
  | "payroll_verification"
  | "persistence";

export type AnalysisErrorCode =
  | "storage_download_failed"
  | "invalid_file"
  | "ai_provider_failed"
  | "ai_output_invalid"
  | "payroll_verification_failed"
  | "persistence_failed"
  | "attempts_exhausted"
  | "unexpected_error";

export class AnalysisJobError extends Error {
  readonly code: AnalysisErrorCode;
  readonly phase: AnalysisPhase;
  readonly retryable: boolean;

  constructor(code: AnalysisErrorCode, phase: AnalysisPhase, retryable: boolean, message: string) {
    super(message);
    this.name = "AnalysisJobError";
    this.code = code;
    this.phase = phase;
    this.retryable = retryable;
  }
}

export interface AnalysisJobState {
  attempts: number;
  leaseId?: string | null;
  phase?: string;
  extracted?: boolean;
  manualRetries?: number;
  lastError?: string | null;
  lastErrorCode?: string | null;
}

export interface ProcessableDocument {
  id: string;
  type: DocumentType;
  filePath: string | null;
  status: AnalysisStatus;
  analysis: unknown;
  rawExtracted: unknown;
  updatedAt: Date;
  deletedAt: Date | null;
}

// Ogni scrittura restituisce il numero di righe aggiornate: zero righe non è mai un successo.
export interface DocumentAnalysisStore {
  findById(documentId: string): Promise<ProcessableDocument | null>;
  claim(input: {
    documentId: string;
    expectedAttempts: number;
    leaseTimeoutMs: number;
    job: AnalysisJobState;
  }): Promise<number>;
  saveExtraction(input: {
    documentId: string;
    leaseId: string;
    type: DocumentType;
    rawExtracted: unknown;
    job: AnalysisJobState;
  }): Promise<number>;
  complete(input: {
    documentId: string;
    leaseId: string;
    type: DocumentType;
    rawExtracted: unknown;
    analysis: unknown;
  }): Promise<number>;
  release(input: {
    documentId: string;
    leaseId: string;
    status: "PENDING" | "ERROR";
    analysis: unknown;
  }): Promise<number>;
  exhaust(input: {
    documentId: string;
    expectedAttempts: number;
    leaseTimeoutMs: number;
    analysis: unknown;
  }): Promise<number>;
}

interface ValidatedDocument {
  tipo_rilevato: unknown;
}

export type AnalysisLogLevel = "info" | "warn" | "error";
export type AnalysisLogger = (
  event: string,
  fields: Record<string, string | number | boolean | null | undefined>,
  level?: AnalysisLogLevel
) => void;

export interface DocumentAnalysisDependencies {
  store: DocumentAnalysisStore;
  download(filePath: string): Promise<Buffer>;
  validateBuffer(buffer: Buffer): string;
  analyze(input: {
    fileBase64: string;
    mimeType: string;
    documentType: DocumentType;
  }): Promise<{ raw: unknown; provider?: string }>;
  validateBill(raw: unknown): ValidatedDocument;
  validatePayroll(raw: unknown): ValidatedDocument;
  enrichBill(validated: ValidatedDocument): Promise<unknown>;
  verifyPayroll(validated: ValidatedDocument): unknown;
  now?: () => Date;
  createLeaseId?: () => string;
  log?: AnalysisLogger;
}

export type AnalysisOutcome =
  | "completed"
  | "completed_without_market"
  | "unsupported"
  | "retry_scheduled"
  | "failed"
  | "exhausted"
  | "lease_lost"
  | "persistence_unconfirmed"
  | "skipped";

export interface AnalysisRunResult {
  documentId: string;
  outcome: AnalysisOutcome;
  claimed: boolean;
  attempt?: number;
  errorCode?: string;
  reason?: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function nonNegativeInteger(value: unknown): number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 ? value : 0;
}

export function getAnalysisJob(analysis: unknown): AnalysisJobState {
  const job = isRecord(analysis) && isRecord(analysis._job) ? analysis._job : {};
  return {
    attempts: nonNegativeInteger(job.attempts),
    leaseId: typeof job.leaseId === "string" ? job.leaseId : null,
    phase: typeof job.phase === "string" ? job.phase : undefined,
    extracted: job.extracted === true,
    manualRetries: nonNegativeInteger(job.manualRetries),
    lastError: typeof job.lastError === "string" ? job.lastError : null,
    lastErrorCode: typeof job.lastErrorCode === "string" ? job.lastErrorCode : null,
  };
}

export function getAnalysisAttempts(analysis: unknown): number {
  return getAnalysisJob(analysis).attempts;
}

function detectedTypeValue(raw: unknown): unknown {
  return isRecord(raw) ? raw.tipo_rilevato : null;
}

function mapDetectedType(value: unknown): DocumentType | null {
  if (value === "luce") return DocumentType.BOLLETTA_LUCE;
  if (value === "gas") return DocumentType.BOLLETTA_GAS;
  if (value === "internet") return DocumentType.BOLLETTA_INTERNET;
  if (value === "busta_paga") return DocumentType.BUSTA_PAGA;
  return null;
}

function isUnsupportedOutput(raw: unknown): boolean {
  return detectedTypeValue(raw) === "sconosciuto";
}

function isLeaseExpired(updatedAt: Date, nowMs: number): boolean {
  return updatedAt.getTime() < nowMs - ANALYSIS_LEASE_TIMEOUT_MS;
}

// Un documento richiede l'intervento del worker se è in coda oppure se il suo lease è scaduto.
// I documenti con tentativi esauriti vengono comunque restituiti: il worker li chiude in ERROR.
export function shouldRecoverAnalysis(
  input: { status: AnalysisStatus; updatedAt: Date; deletedAt?: Date | null },
  nowMs = Date.now()
): boolean {
  if (input.deletedAt) return false;
  if (input.status === AnalysisStatus.PENDING) return true;
  if (input.status !== AnalysisStatus.PROCESSING) return false;
  return isLeaseExpired(input.updatedAt, nowMs);
}

export function canRetryAnalysisManually(input: { status: AnalysisStatus; analysis: unknown }): boolean {
  if (input.status !== AnalysisStatus.ERROR) return false;
  if (isRecord(input.analysis) && input.analysis.error === UNSUPPORTED_DOCUMENT_ERROR) return false;
  return (getAnalysisJob(input.analysis).manualRetries ?? 0) < MAX_MANUAL_RETRIES;
}

function safeMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : typeof error === "string" ? error : "Errore sconosciuto";
  return message.slice(0, 500);
}

function toJobError(error: unknown): AnalysisJobError {
  if (error instanceof AnalysisJobError) return error;
  return new AnalysisJobError("unexpected_error", "persistence", true, safeMessage(error));
}

async function runPhase<T>(
  phase: AnalysisPhase,
  code: AnalysisErrorCode,
  retryable: boolean,
  operation: () => T | Promise<T>
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (error instanceof AnalysisJobError) throw error;
    throw new AnalysisJobError(code, phase, retryable, safeMessage(error));
  }
}

const noopLog: AnalysisLogger = () => {};

export function createDocumentAnalysisProcessor(deps: DocumentAnalysisDependencies) {
  const log = deps.log ?? noopLog;
  const createLeaseId = deps.createLeaseId ?? (() => crypto.randomUUID());

  // Distingue esplicitamente il motivo di un aggiornamento condizionato che non ha modificato righe.
  async function explainZeroRows(
    documentId: string,
    leaseId: string,
    attempt: number,
    phase: AnalysisPhase
  ): Promise<AnalysisRunResult> {
    const latest = await deps.store.findById(documentId).catch(() => null);
    let reason: string;
    if (!latest || latest.deletedAt || latest.status === AnalysisStatus.DELETED) reason = "document_deleted";
    else if (latest.status === AnalysisStatus.DONE || latest.status === AnalysisStatus.ERROR) reason = "already_final";
    else if (latest.status === AnalysisStatus.PROCESSING && getAnalysisJob(latest.analysis).leaseId !== leaseId) reason = "lease_taken";
    else reason = "unexpected";

    const unexpected = reason === "unexpected";
    log(unexpected ? "analysis.persistence_unconfirmed" : "analysis.lease_lost", {
      documentId,
      attempt,
      phase,
      reason,
      currentStatus: latest?.status ?? null,
    }, unexpected ? "error" : "warn");

    return {
      documentId,
      outcome: unexpected ? "persistence_unconfirmed" : "lease_lost",
      claimed: true,
      attempt,
      reason,
    };
  }

  return async function processDocumentAnalysis(documentId: string): Promise<AnalysisRunResult> {
    const skipped = (reason: string): AnalysisRunResult => ({ documentId, outcome: "skipped", claimed: false, reason });

    const current = await deps.store.findById(documentId);
    if (!current) return skipped("not_found");
    if (current.deletedAt || current.status === AnalysisStatus.DELETED) return skipped("deleted");
    if (!current.filePath) return skipped("missing_file");
    if (current.status !== AnalysisStatus.PENDING && current.status !== AnalysisStatus.PROCESSING) {
      return skipped("not_processable");
    }

    const now = deps.now?.() ?? new Date();
    if (current.status === AnalysisStatus.PROCESSING && !isLeaseExpired(current.updatedAt, now.getTime())) {
      return skipped("lease_active");
    }

    const previousJob = getAnalysisJob(current.analysis);

    if (previousJob.attempts >= MAX_ANALYSIS_ATTEMPTS) {
      const job: AnalysisJobState = {
        ...previousJob,
        leaseId: null,
        phase: "exhausted",
        lastErrorCode: previousJob.lastErrorCode ?? "attempts_exhausted",
      };
      const rows = await deps.store.exhaust({
        documentId,
        expectedAttempts: previousJob.attempts,
        leaseTimeoutMs: ANALYSIS_LEASE_TIMEOUT_MS,
        analysis: { errore: FAILED_DOCUMENT_MESSAGE, error: "attempts_exhausted", _job: job },
      });
      if (rows === 0) return skipped("exhaust_not_applied");
      log("analysis.attempts_exhausted", {
        documentId,
        attempts: previousJob.attempts,
        previousStatus: current.status,
        lastErrorCode: previousJob.lastErrorCode,
      }, "error");
      return { documentId, outcome: "exhausted", claimed: false, attempt: previousJob.attempts, errorCode: "attempts_exhausted" };
    }

    const attempt = previousJob.attempts + 1;
    const leaseId = createLeaseId();
    let job: AnalysisJobState = {
      ...previousJob,
      attempts: attempt,
      leaseId,
      phase: "claimed",
    };

    const claimedRows = await deps.store.claim({
      documentId,
      expectedAttempts: previousJob.attempts,
      leaseTimeoutMs: ANALYSIS_LEASE_TIMEOUT_MS,
      job,
    });
    if (claimedRows === 0) return skipped("claim_conflict");

    const startedAt = Date.now();
    const recovered = current.status === AnalysisStatus.PROCESSING;
    log("analysis.claimed", { documentId, attempt, previousStatus: current.status });
    if (recovered) {
      log("analysis.recovered", { documentId, attempt, reason: "lease_expired" }, "warn");
    }

    let phase: AnalysisPhase = "download";

    try {
      let validated: ValidatedDocument;
      let effectiveType: DocumentType;
      const reusable = previousJob.extracted && isRecord(current.rawExtracted)
        ? mapDetectedType(detectedTypeValue(current.rawExtracted))
        : null;

      if (reusable) {
        // Estrazione già validata e salvata da un tentativo precedente: niente nuova chiamata AI.
        validated = current.rawExtracted as ValidatedDocument;
        effectiveType = reusable;
        log("analysis.extraction_reused", { documentId, attempt, type: effectiveType });
      } else {
        phase = "download";
        const downloadStartedAt = Date.now();
        const buffer = await runPhase(phase, "storage_download_failed", true, () => deps.download(current.filePath!));
        log("storage.document_download_completed", { documentId, attempt, durationMs: Date.now() - downloadStartedAt });

        phase = "file_validation";
        const mimeType = await runPhase(phase, "invalid_file", false, () => deps.validateBuffer(buffer));

        phase = "ai";
        const aiStartedAt = Date.now();
        const { raw, provider } = await runPhase(phase, "ai_provider_failed", true, () => deps.analyze({
          fileBase64: buffer.toString("base64"),
          mimeType,
          documentType: current.type,
        }));
        log("ai.analysis_completed", {
          documentId,
          attempt,
          provider: provider ?? null,
          documentTypeHint: current.type,
          durationMs: Date.now() - aiStartedAt,
        });

        if (isUnsupportedOutput(raw)) {
          phase = "persistence";
          const rows = await runPhase(phase, "persistence_failed", true, () => deps.store.release({
            documentId,
            leaseId,
            status: "ERROR",
            analysis: {
              error: UNSUPPORTED_DOCUMENT_ERROR,
              message: UNSUPPORTED_DOCUMENT_MESSAGE,
              _job: { ...job, leaseId: null, phase: "unsupported" },
            },
          }));
          if (rows === 0) return explainZeroRows(documentId, leaseId, attempt, phase);
          log("analysis.unsupported", { documentId, attempt, durationMs: Date.now() - startedAt }, "warn");
          return { documentId, outcome: "unsupported", claimed: true, attempt };
        }

        phase = "validation";
        const validationStartedAt = Date.now();
        const detected = mapDetectedType(detectedTypeValue(raw));
        if (!detected) {
          throw new AnalysisJobError("ai_output_invalid", phase, true, "Tipo documento AI non riconosciuto.");
        }
        effectiveType = detected;
        validated = await runPhase(phase, "ai_output_invalid", true, () => (
          detected === DocumentType.BUSTA_PAGA ? deps.validatePayroll(raw) : deps.validateBill(raw)
        ));
        log("analysis.validation_completed", {
          documentId,
          attempt,
          type: effectiveType,
          durationMs: Date.now() - validationStartedAt,
        });

        // Checkpoint: l'estrazione valida viene salvata prima dell'arricchimento,
        // così un'interruzione successiva non richiede di rieseguire l'AI.
        phase = "checkpoint";
        const extractedJob: AnalysisJobState = { ...job, phase: "extracted", extracted: true };
        const rows = await runPhase(phase, "persistence_failed", true, () => deps.store.saveExtraction({
          documentId,
          leaseId,
          type: effectiveType,
          rawExtracted: validated,
          job: extractedJob,
        }));
        if (rows === 0) return explainZeroRows(documentId, leaseId, attempt, phase);
        job = extractedJob;
      }

      let analysis: unknown;
      let marketComparison: "available" | "not_applicable" | "unavailable" | null = null;

      if (effectiveType === DocumentType.BUSTA_PAGA) {
        phase = "payroll_verification";
        const verifica = await runPhase(phase, "payroll_verification_failed", true, () => deps.verifyPayroll(validated));
        analysis = { ...validated, verifica };
      } else {
        phase = "enrichment";
        const enrichmentStartedAt = Date.now();
        try {
          analysis = await deps.enrichBill(validated);
          marketComparison = isRecord(analysis) && analysis.confronto_mercato ? "available" : "not_applicable";
          log("analysis.enrichment_completed", {
            documentId,
            attempt,
            marketComparison,
            durationMs: Date.now() - enrichmentStartedAt,
          });
        } catch (error) {
          // Il confronto mercato è un arricchimento: un suo errore non invalida un'estrazione corretta.
          // Il job notturno refresh-market-rates lo ricalcola sui documenti DONE.
          marketComparison = "unavailable";
          analysis = { ...validated, confronto_mercato: null, confronto_mercato_stato: "non_disponibile" };
          log("analysis.enrichment_failed", {
            documentId,
            attempt,
            durationMs: Date.now() - enrichmentStartedAt,
            error: safeMessage(error),
          }, "warn");
        }
      }

      phase = "persistence";
      const persistenceStartedAt = Date.now();
      const rows = await runPhase(phase, "persistence_failed", true, () => deps.store.complete({
        documentId,
        leaseId,
        type: effectiveType,
        rawExtracted: validated,
        analysis,
      }));
      if (rows === 0) return explainZeroRows(documentId, leaseId, attempt, phase);

      log("analysis.completed", {
        documentId,
        attempt,
        type: effectiveType,
        marketComparison,
        persistenceMs: Date.now() - persistenceStartedAt,
        durationMs: Date.now() - startedAt,
      });
      return {
        documentId,
        outcome: marketComparison === "unavailable" ? "completed_without_market" : "completed",
        claimed: true,
        attempt,
      };
    } catch (error) {
      const failure = toJobError(error);
      const failedPhase = error instanceof AnalysisJobError ? failure.phase : phase;
      const exhausted = !failure.retryable || attempt >= MAX_ANALYSIS_ATTEMPTS;
      const failedJob: AnalysisJobState = {
        ...job,
        leaseId: null,
        phase: exhausted ? "failed" : "retry_pending",
        lastError: failure.message,
        lastErrorCode: failure.code,
      };

      let rows: number;
      try {
        rows = await deps.store.release({
          documentId,
          leaseId,
          status: exhausted ? "ERROR" : "PENDING",
          analysis: exhausted
            ? { errore: FAILED_DOCUMENT_MESSAGE, error: failure.code, _job: failedJob }
            : { _job: failedJob },
        });
      } catch (releaseError) {
        // Il documento resta PROCESSING: verrà recuperato alla scadenza del lease.
        log("analysis.failed", {
          documentId,
          attempt,
          phase: failedPhase,
          errorCode: failure.code,
          releaseErrorCode: "persistence_failed",
          error: safeMessage(releaseError),
          durationMs: Date.now() - startedAt,
        }, "error");
        return { documentId, outcome: "persistence_unconfirmed", claimed: true, attempt, errorCode: failure.code };
      }

      if (rows === 0) return explainZeroRows(documentId, leaseId, attempt, failedPhase);

      const fields = {
        documentId,
        attempt,
        phase: failedPhase,
        errorCode: failure.code,
        retryable: failure.retryable,
        error: failure.message,
        durationMs: Date.now() - startedAt,
      };
      if (exhausted) {
        log("analysis.failed", fields, "error");
        if (failure.retryable) log("analysis.attempts_exhausted", { documentId, attempts: attempt, lastErrorCode: failure.code }, "error");
        return { documentId, outcome: "failed", claimed: true, attempt, errorCode: failure.code };
      }
      log("analysis.retry_scheduled", fields, "warn");
      return { documentId, outcome: "retry_scheduled", claimed: true, attempt, errorCode: failure.code };
    }
  };
}
