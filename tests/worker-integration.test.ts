import assert from "node:assert/strict";
import test from "node:test";
import { AnalysisStatus, DocumentType } from "@prisma/client";
import {
  ANALYSIS_LEASE_TIMEOUT_MS,
  MAX_ANALYSIS_ATTEMPTS,
  canRetryAnalysisManually,
  createDocumentAnalysisProcessor,
  getAnalysisJob,
  shouldRecoverAnalysis,
  type DocumentAnalysisDependencies,
  type DocumentAnalysisStore,
  type ProcessableDocument,
} from "../lib/jobs/process-document-core.ts";

// Store in memoria che riproduce la semantica SQL di lib/jobs/analysis-sql.ts,
// incluso il trigger di produzione che riscrive updatedAt a ogni UPDATE con l'orologio del DB.
class FakeStore implements DocumentAnalysisStore {
  document: ProcessableDocument | null;
  dbNowMs: number;
  writes = 0;
  failComplete = false;
  failRelease = false;

  constructor(document: ProcessableDocument | null, dbNowMs: number) {
    this.document = document;
    this.dbNowMs = dbNowMs;
  }

  private touch() {
    // Il trigger usa NOW() del DB: mai uguale al Date del worker.
    this.document!.updatedAt = new Date(this.dbNowMs + 0.5);
    this.writes++;
  }

  private holdsLease(documentId: string, leaseId: string): boolean {
    const doc = this.document;
    return Boolean(
      doc &&
      doc.id === documentId &&
      doc.status === AnalysisStatus.PROCESSING &&
      doc.deletedAt === null &&
      getAnalysisJob(doc.analysis).leaseId === leaseId
    );
  }

  private claimable(expectedAttempts: number, leaseTimeoutMs: number): boolean {
    const doc = this.document;
    if (!doc || doc.deletedAt || !doc.filePath) return false;
    if (getAnalysisJob(doc.analysis).attempts !== expectedAttempts) return false;
    if (doc.status === AnalysisStatus.PENDING) return true;
    return doc.status === AnalysisStatus.PROCESSING && doc.updatedAt.getTime() < this.dbNowMs - leaseTimeoutMs;
  }

  async findById(documentId: string): Promise<ProcessableDocument | null> {
    if (!this.document || this.document.id !== documentId) return null;
    return structuredClone(this.document);
  }

  async claim(input: Parameters<DocumentAnalysisStore["claim"]>[0]): Promise<number> {
    if (this.document?.id !== input.documentId || !this.claimable(input.expectedAttempts, input.leaseTimeoutMs)) return 0;
    this.document!.status = AnalysisStatus.PROCESSING;
    this.document!.analysis = { _job: structuredClone(input.job) };
    this.touch();
    return 1;
  }

  async saveExtraction(input: Parameters<DocumentAnalysisStore["saveExtraction"]>[0]): Promise<number> {
    if (!this.holdsLease(input.documentId, input.leaseId)) return 0;
    this.document!.type = input.type;
    this.document!.rawExtracted = structuredClone(input.rawExtracted);
    this.document!.analysis = { _job: structuredClone(input.job) };
    this.touch();
    return 1;
  }

  async complete(input: Parameters<DocumentAnalysisStore["complete"]>[0]): Promise<number> {
    if (this.failComplete) throw new Error("connessione al database interrotta");
    if (!this.holdsLease(input.documentId, input.leaseId)) return 0;
    this.document!.type = input.type;
    this.document!.status = AnalysisStatus.DONE;
    this.document!.rawExtracted = structuredClone(input.rawExtracted);
    this.document!.analysis = structuredClone(input.analysis);
    this.touch();
    return 1;
  }

  async release(input: Parameters<DocumentAnalysisStore["release"]>[0]): Promise<number> {
    if (this.failRelease) throw new Error("connessione al database interrotta");
    if (!this.holdsLease(input.documentId, input.leaseId)) return 0;
    this.document!.status = input.status === "ERROR" ? AnalysisStatus.ERROR : AnalysisStatus.PENDING;
    this.document!.analysis = structuredClone(input.analysis);
    this.touch();
    return 1;
  }

  async exhaust(input: Parameters<DocumentAnalysisStore["exhaust"]>[0]): Promise<number> {
    if (this.document?.id !== input.documentId || !this.claimable(input.expectedAttempts, input.leaseTimeoutMs)) return 0;
    this.document!.status = AnalysisStatus.ERROR;
    this.document!.analysis = structuredClone(input.analysis);
    this.touch();
    return 1;
  }
}

const T0 = new Date("2026-10-10T19:55:00.000Z").getTime();

function pendingDocument(overrides: Partial<ProcessableDocument> = {}): ProcessableDocument {
  return {
    id: "doc-1",
    type: DocumentType.BOLLETTA_LUCE,
    filePath: "uploads/user/doc-1.pdf",
    status: AnalysisStatus.PENDING,
    analysis: null,
    rawExtracted: null,
    updatedAt: new Date(T0),
    deletedAt: null,
    ...overrides,
  };
}

const VALID_BILL = { tipo_rilevato: "luce", tipo: "luce", fornitore: "Fornitore Sintetico", importo_totale: 84.2 };

type Overrides = Partial<Pick<DocumentAnalysisDependencies, "analyze" | "download" | "validateBill" | "enrichBill" | "validateBuffer">>;

function createHarness(options: { document?: ProcessableDocument | null; overrides?: Overrides } = {}) {
  let clockMs = T0 + 10_000;
  const store = new FakeStore(options.document === undefined ? pendingDocument() : options.document, clockMs);
  const events: Array<{ event: string; fields: Record<string, unknown>; level?: string }> = [];
  let analyzeCalls = 0;
  let downloadCalls = 0;
  let leaseCounter = 0;

  const deps: DocumentAnalysisDependencies = {
    store,
    async download(filePath) {
      downloadCalls++;
      if (options.overrides?.download) return options.overrides.download(filePath);
      return Buffer.from("%PDF-sintetico");
    },
    validateBuffer(buffer) {
      if (options.overrides?.validateBuffer) return options.overrides.validateBuffer(buffer);
      return "application/pdf";
    },
    async analyze(input) {
      analyzeCalls++;
      if (options.overrides?.analyze) return options.overrides.analyze(input);
      return { raw: structuredClone(VALID_BILL), provider: "anthropic" };
    },
    validateBill(raw) {
      if (options.overrides?.validateBill) return options.overrides.validateBill(raw);
      return raw as { tipo_rilevato: unknown };
    },
    validatePayroll(raw) {
      return raw as { tipo_rilevato: unknown };
    },
    async enrichBill(validated) {
      if (options.overrides?.enrichBill) return options.overrides.enrichBill(validated);
      return { ...validated, confronto_mercato: { offerte: [] } };
    },
    verifyPayroll() {
      return { verdict: "coerente", engineVersion: "payroll-coherence-v2" };
    },
    now: () => new Date(clockMs),
    createLeaseId: () => `lease-${++leaseCounter}`,
    log: (event, fields, level) => events.push({ event, fields, level }),
  };

  return {
    store,
    deps,
    events,
    process: createDocumentAnalysisProcessor(deps),
    advance(ms: number) {
      clockMs += ms;
      store.dbNowMs = clockMs;
    },
    analyzeCalls: () => analyzeCalls,
    downloadCalls: () => downloadCalls,
    eventNames: () => events.map((entry) => entry.event),
    job: () => getAnalysisJob(store.document?.analysis),
  };
}

test("analisi completata: il documento arriva a DONE anche con il trigger che riscrive updatedAt", async () => {
  const harness = createHarness();

  const result = await harness.process("doc-1");

  assert.equal(result.outcome, "completed");
  assert.equal(harness.store.document?.status, AnalysisStatus.DONE);
  assert.equal(harness.store.document?.type, DocumentType.BOLLETTA_LUCE);
  assert.deepEqual(harness.store.document?.rawExtracted, VALID_BILL);
  assert.ok((harness.store.document?.analysis as { confronto_mercato?: unknown }).confronto_mercato);
  assert.deepEqual(harness.eventNames(), [
    "analysis.claimed",
    "storage.document_download_completed",
    "ai.analysis_completed",
    "analysis.validation_completed",
    "analysis.enrichment_completed",
    "analysis.completed",
  ]);
  for (const entry of harness.events) assert.equal(entry.fields.documentId, "doc-1");
});

test("output Anthropic non valido: retry programmato con codice strutturato", async () => {
  const harness = createHarness({
    overrides: {
      validateBill() {
        throw new Error("Output AI non valido: importo_totale deve essere un numero finito.");
      },
    },
  });

  const result = await harness.process("doc-1");

  assert.equal(result.outcome, "retry_scheduled");
  assert.equal(harness.store.document?.status, AnalysisStatus.PENDING);
  assert.equal(harness.job().attempts, 1);
  assert.equal(harness.job().lastErrorCode, "ai_output_invalid");
  assert.equal(harness.job().leaseId, null);
  assert.ok(harness.eventNames().includes("analysis.retry_scheduled"));
});

test("documento non supportato: ERROR esplicito senza retry", async () => {
  const harness = createHarness({
    overrides: { analyze: async () => ({ raw: { tipo_rilevato: "sconosciuto" }, provider: "anthropic" }) },
  });

  const result = await harness.process("doc-1");

  assert.equal(result.outcome, "unsupported");
  assert.equal(harness.store.document?.status, AnalysisStatus.ERROR);
  assert.equal((harness.store.document?.analysis as { error?: string }).error, "documento_non_supportato");
  assert.equal(canRetryAnalysisManually(harness.store.document!), false);
  assert.equal((await harness.process("doc-1")).outcome, "skipped");
  assert.equal(harness.analyzeCalls(), 1);
});

test("errore nel confronto mercato: estrazione valida salvata come DONE con confronto non disponibile", async () => {
  const harness = createHarness({
    overrides: {
      enrichBill: async () => {
        throw new Error("timeout query MarketRate");
      },
    },
  });

  const result = await harness.process("doc-1");

  assert.equal(result.outcome, "completed_without_market");
  assert.equal(harness.store.document?.status, AnalysisStatus.DONE);
  const analysis = harness.store.document?.analysis as Record<string, unknown>;
  assert.equal(analysis.fornitore, "Fornitore Sintetico");
  assert.equal(analysis.confronto_mercato, null);
  assert.equal(analysis.confronto_mercato_stato, "non_disponibile");
  assert.ok(harness.eventNames().includes("analysis.enrichment_failed"));
});

test("errore di persistenza: retry che riusa l'estrazione salvata senza rieseguire Anthropic", async () => {
  const harness = createHarness();
  harness.store.failComplete = true;

  const first = await harness.process("doc-1");
  assert.equal(first.outcome, "retry_scheduled");
  assert.equal(first.errorCode, "persistence_failed");
  assert.equal(harness.store.document?.status, AnalysisStatus.PENDING);
  assert.equal(harness.job().extracted, true);
  assert.deepEqual(harness.store.document?.rawExtracted, VALID_BILL);

  harness.store.failComplete = false;
  const second = await harness.process("doc-1");

  assert.equal(second.outcome, "completed");
  assert.equal(harness.analyzeCalls(), 1);
  assert.equal(harness.downloadCalls(), 1);
  assert.ok(harness.eventNames().includes("analysis.extraction_reused"));
});

test("worker interrotto dopo Anthropic: recovery dopo il lease senza nuova chiamata AI", async () => {
  const harness = createHarness();
  // Simula una funzione terminata dopo il checkpoint: né complete né release riescono a scrivere.
  harness.store.failComplete = true;
  harness.store.failRelease = true;

  const interrupted = await harness.process("doc-1");
  assert.equal(interrupted.outcome, "persistence_unconfirmed");
  assert.equal(harness.store.document?.status, AnalysisStatus.PROCESSING);

  harness.store.failComplete = false;
  harness.store.failRelease = false;
  assert.equal((await harness.process("doc-1")).outcome, "skipped", "lease ancora valido");

  harness.advance(ANALYSIS_LEASE_TIMEOUT_MS + 1_000);
  const recovered = await harness.process("doc-1");

  assert.equal(recovered.outcome, "completed");
  assert.equal(recovered.attempt, 2);
  assert.equal(harness.analyzeCalls(), 1);
  assert.ok(harness.eventNames().includes("analysis.recovered"));
});

test("lease PROCESSING scaduto senza checkpoint viene recuperato", async () => {
  const harness = createHarness({
    document: pendingDocument({
      status: AnalysisStatus.PROCESSING,
      updatedAt: new Date(T0 - ANALYSIS_LEASE_TIMEOUT_MS),
      analysis: { _job: { attempts: 1, lastError: null } },
    }),
  });

  const result = await harness.process("doc-1");

  assert.equal(result.outcome, "completed");
  assert.equal(result.attempt, 2);
  assert.equal(harness.store.document?.status, AnalysisStatus.DONE);
});

test("lease PROCESSING ancora valido non viene rubato", async () => {
  const harness = createHarness({
    document: pendingDocument({
      status: AnalysisStatus.PROCESSING,
      updatedAt: new Date(T0 + 5_000),
      analysis: { _job: { attempts: 1, leaseId: "lease-altro" } },
    }),
  });

  assert.equal((await harness.process("doc-1")).reason, "lease_active");
  assert.equal(harness.downloadCalls(), 0);
  assert.equal(harness.store.writes, 0);
});

test("due worker concorrenti elaborano lo stesso documento una sola volta", async () => {
  const harness = createHarness();

  const results = await Promise.all([harness.process("doc-1"), harness.process("doc-1")]);

  assert.deepEqual(results.map((result) => result.outcome).sort(), ["completed", "skipped"]);
  assert.equal(harness.analyzeCalls(), 1);
  assert.equal(harness.store.document?.status, AnalysisStatus.DONE);
});

test("retry con tentativi disponibili e poi tentativi esauriti in ERROR", async () => {
  const harness = createHarness({
    overrides: {
      analyze: async () => {
        throw new Error("529 overloaded");
      },
    },
  });

  for (let attempt = 1; attempt < MAX_ANALYSIS_ATTEMPTS; attempt++) {
    const result = await harness.process("doc-1");
    assert.equal(result.outcome, "retry_scheduled");
    assert.equal(harness.store.document?.status, AnalysisStatus.PENDING);
    assert.equal(harness.job().attempts, attempt);
  }

  const last = await harness.process("doc-1");
  assert.equal(last.outcome, "failed");
  assert.equal(harness.store.document?.status, AnalysisStatus.ERROR);
  assert.equal(harness.job().attempts, MAX_ANALYSIS_ATTEMPTS);
  assert.equal((harness.store.document?.analysis as { error?: string }).error, "ai_provider_failed");
  assert.ok(harness.eventNames().includes("analysis.attempts_exhausted"));

  assert.equal((await harness.process("doc-1")).outcome, "skipped");
  assert.equal(harness.analyzeCalls(), MAX_ANALYSIS_ATTEMPTS);
});

test("file non valido: errore definitivo senza consumare altri tentativi", async () => {
  const harness = createHarness({
    overrides: {
      validateBuffer() {
        throw new Error("Formato file non supportato.");
      },
    },
  });

  const result = await harness.process("doc-1");

  assert.equal(result.outcome, "failed");
  assert.equal(result.errorCode, "invalid_file");
  assert.equal(harness.store.document?.status, AnalysisStatus.ERROR);
  assert.equal(harness.analyzeCalls(), 0);
});

test("recovery di un PENDING bloccato dopo un retry", async () => {
  const harness = createHarness({
    document: pendingDocument({
      analysis: { _job: { attempts: 1, lastError: "529 overloaded", lastErrorCode: "ai_provider_failed" } },
    }),
  });

  assert.equal(shouldRecoverAnalysis(harness.store.document!), true);
  const result = await harness.process("doc-1");

  assert.equal(result.outcome, "completed");
  assert.equal(result.attempt, 2);
});

test("PROCESSING obsoleto con tentativi esauriti viene chiuso in ERROR invece di restare bloccato", async () => {
  const harness = createHarness({
    document: pendingDocument({
      status: AnalysisStatus.PROCESSING,
      updatedAt: new Date(T0 - ANALYSIS_LEASE_TIMEOUT_MS),
      analysis: { _job: { attempts: MAX_ANALYSIS_ATTEMPTS, leaseId: "lease-morto" } },
    }),
  });

  assert.equal(shouldRecoverAnalysis(harness.store.document!, T0 + 10_000), true);
  const result = await harness.process("doc-1");

  assert.equal(result.outcome, "exhausted");
  assert.equal(harness.store.document?.status, AnalysisStatus.ERROR);
  assert.equal((harness.store.document?.analysis as { error?: string }).error, "attempts_exhausted");
  assert.equal(harness.analyzeCalls(), 0);
  assert.equal(canRetryAnalysisManually(harness.store.document!), true);
});

test("documento DONE non viene rielaborato", async () => {
  const done = { ...VALID_BILL, confronto_mercato: null };
  const harness = createHarness({
    document: pendingDocument({ status: AnalysisStatus.DONE, analysis: done, rawExtracted: VALID_BILL }),
  });

  assert.equal(shouldRecoverAnalysis(harness.store.document!), false);
  assert.equal((await harness.process("doc-1")).reason, "not_processable");
  assert.equal(harness.store.writes, 0);
  assert.deepEqual(harness.store.document?.analysis, done);
});

test("documento eliminato non viene rielaborato", async () => {
  const deleted = createHarness({ document: pendingDocument({ deletedAt: new Date(T0) }) });
  assert.equal(shouldRecoverAnalysis(deleted.store.document!), false);
  assert.equal((await deleted.process("doc-1")).reason, "deleted");
  assert.equal(deleted.downloadCalls(), 0);

  const withoutFile = createHarness({ document: pendingDocument({ filePath: null }) });
  assert.equal((await withoutFile.process("doc-1")).reason, "missing_file");
  assert.equal(withoutFile.analyzeCalls(), 0);
});

test("eliminazione durante l'elaborazione: nessuna scrittura successiva e lease perso esplicito", async () => {
  const harness: ReturnType<typeof createHarness> = createHarness({
    overrides: {
      analyze: async () => {
        harness.store.document!.status = AnalysisStatus.DELETED;
        harness.store.document!.deletedAt = new Date(T0);
        harness.store.document!.analysis = null;
        return { raw: structuredClone(VALID_BILL), provider: "anthropic" };
      },
    },
  });

  const result = await harness.process("doc-1");

  assert.equal(result.outcome, "lease_lost");
  assert.equal(result.reason, "document_deleted");
  assert.equal(harness.store.document?.status, AnalysisStatus.DELETED);
  assert.equal(harness.store.document?.rawExtracted, null);
});

test("update condizionato a zero righe: lease sottratto da un altro worker", async () => {
  const harness: ReturnType<typeof createHarness> = createHarness({
    overrides: {
      enrichBill: async (validated) => {
        // Un secondo worker ha recuperato il documento dopo la scadenza del lease.
        harness.store.document!.analysis = { _job: { attempts: 2, leaseId: "lease-altro-worker" } };
        return { ...validated, confronto_mercato: null };
      },
    },
  });

  const result = await harness.process("doc-1");

  assert.equal(result.outcome, "lease_lost");
  assert.equal(result.reason, "lease_taken");
  assert.equal(harness.store.document?.status, AnalysisStatus.PROCESSING);
  const lost = harness.events.find((entry) => entry.event === "analysis.lease_lost");
  assert.equal(lost?.fields.phase, "persistence");
  assert.ok(!harness.eventNames().includes("analysis.completed"));
});

test("update condizionato a zero righe con documento ancora in coda viene segnalato come inatteso", async () => {
  const harness: ReturnType<typeof createHarness> = createHarness({
    overrides: {
      enrichBill: async (validated) => {
        harness.store.document!.status = AnalysisStatus.PENDING;
        return { ...validated, confronto_mercato: null };
      },
    },
  });

  const result = await harness.process("doc-1");

  assert.equal(result.outcome, "persistence_unconfirmed");
  assert.equal(result.reason, "unexpected");
  const event = harness.events.find((entry) => entry.event === "analysis.persistence_unconfirmed");
  assert.equal(event?.level, "error");
});

test("un worker con lease scaduto non sovrascrive un risultato DONE valido", async () => {
  const saved = { ...VALID_BILL, fornitore: "Risultato già salvato", confronto_mercato: null };
  const harness: ReturnType<typeof createHarness> = createHarness({
    overrides: {
      enrichBill: async () => {
        harness.store.document!.status = AnalysisStatus.DONE;
        harness.store.document!.analysis = structuredClone(saved);
        throw new Error("market down");
      },
    },
  });

  const result = await harness.process("doc-1");

  assert.equal(result.outcome, "lease_lost");
  assert.equal(result.reason, "already_final");
  assert.equal(harness.store.document?.status, AnalysisStatus.DONE);
  assert.deepEqual(harness.store.document?.analysis, saved);
});

test("auto-detection instrada una busta paga anche se il tipo iniziale era bolletta", async () => {
  const harness = createHarness({
    overrides: { analyze: async () => ({ raw: { tipo_rilevato: "busta_paga", stipendio_lordo: 2000 }, provider: "anthropic" }) },
  });

  assert.equal((await harness.process("doc-1")).outcome, "completed");
  assert.equal(harness.store.document?.type, DocumentType.BUSTA_PAGA);
  assert.equal((harness.store.document?.analysis as { verifica?: { verdict?: string } }).verifica?.verdict, "coerente");
});

test("i log non contengono contenuti del documento", async () => {
  const harness = createHarness();
  await harness.process("doc-1");

  const serialized = JSON.stringify(harness.events);
  assert.ok(!serialized.includes("Fornitore Sintetico"));
  assert.ok(!serialized.includes("84.2"));
});

test("retry manuale consentito solo per errori non definitivi e entro il limite", () => {
  assert.equal(canRetryAnalysisManually({ status: AnalysisStatus.ERROR, analysis: { error: "ai_provider_failed", _job: { attempts: 3 } } }), true);
  assert.equal(canRetryAnalysisManually({ status: AnalysisStatus.ERROR, analysis: { error: "x", _job: { attempts: 3, manualRetries: 2 } } }), false);
  assert.equal(canRetryAnalysisManually({ status: AnalysisStatus.ERROR, analysis: { error: "documento_non_supportato" } }), false);
  assert.equal(canRetryAnalysisManually({ status: AnalysisStatus.DONE, analysis: {} }), false);
});
