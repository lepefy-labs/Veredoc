import assert from "node:assert/strict";
import test from "node:test";
import { AnalysisStatus, DocumentType } from "@prisma/client";
import {
  ANALYSIS_LEASE_TIMEOUT_MS,
  createDocumentAnalysisProcessor,
  type DocumentAnalysisDependencies,
  type DocumentAnalysisStore,
  type ProcessableDocument,
} from "../lib/jobs/process-document-core.ts";

class FakeStore implements DocumentAnalysisStore {
  document: ProcessableDocument | null;

  constructor(document: ProcessableDocument | null) {
    this.document = document;
  }

  async findById(documentId: string): Promise<ProcessableDocument | null> {
    if (!this.document || this.document.id !== documentId) return null;
    return { ...this.document, updatedAt: new Date(this.document.updatedAt), deletedAt: this.document.deletedAt && new Date(this.document.deletedAt) };
  }

  async claim({ document, leaseTime, attempt }: Parameters<DocumentAnalysisStore["claim"]>[0]): Promise<boolean> {
    if (!this.document) return false;
    if (
      this.document.id !== document.id ||
      this.document.status !== document.status ||
      this.document.updatedAt.getTime() !== document.updatedAt.getTime() ||
      this.document.deletedAt !== null
    ) {
      return false;
    }

    this.document.status = AnalysisStatus.PROCESSING;
    this.document.updatedAt = leaseTime;
    this.document.analysis = { _job: { attempts: attempt, lastError: null } };
    return true;
  }

  async complete(input: Parameters<DocumentAnalysisStore["complete"]>[0]): Promise<void> {
    if (!this.hasLease(input.documentId, input.leaseTime)) return;
    this.document!.type = input.type;
    this.document!.status = AnalysisStatus.DONE;
    this.document!.analysis = input.analysis;
  }

  async markUnsupported(input: Parameters<DocumentAnalysisStore["markUnsupported"]>[0]): Promise<void> {
    if (!this.hasLease(input.documentId, input.leaseTime)) return;
    this.document!.status = AnalysisStatus.ERROR;
    this.document!.analysis = { error: "documento_non_supportato" };
  }

  async markFailure(input: Parameters<DocumentAnalysisStore["markFailure"]>[0]): Promise<void> {
    if (!this.hasLease(input.documentId, input.leaseTime)) return;
    this.document!.status = input.exhausted ? AnalysisStatus.ERROR : AnalysisStatus.PENDING;
    this.document!.analysis = {
      _job: { attempts: input.attempts, lastError: input.message },
      ...(input.exhausted ? { errore: input.message } : {}),
    };
  }

  private hasLease(documentId: string, leaseTime: Date): boolean {
    return Boolean(
      this.document &&
      this.document.id === documentId &&
      this.document.status === AnalysisStatus.PROCESSING &&
      this.document.updatedAt.getTime() === leaseTime.getTime()
    );
  }
}

function pendingDocument(overrides: Partial<ProcessableDocument> = {}): ProcessableDocument {
  return {
    id: "doc-1",
    type: DocumentType.BOLLETTA_LUCE,
    filePath: "user/doc-1.pdf",
    status: AnalysisStatus.PENDING,
    analysis: null,
    updatedAt: new Date("2026-08-30T10:00:00.000Z"),
    deletedAt: null,
    ...overrides,
  };
}

function createHarness(options: {
  document?: ProcessableDocument | null;
  analyze?: DocumentAnalysisDependencies["analyze"];
  download?: DocumentAnalysisDependencies["download"];
  now?: Date;
} = {}) {
  const store = new FakeStore(options.document === undefined ? pendingDocument() : options.document);
  let analyzeCalls = 0;
  let downloadCalls = 0;

  const deps: DocumentAnalysisDependencies = {
    store,
    async download(filePath) {
      downloadCalls++;
      if (options.download) return options.download(filePath);
      return Buffer.from("fake-pdf");
    },
    validateBuffer() {
      return "application/pdf";
    },
    async analyze(input) {
      analyzeCalls++;
      if (options.analyze) return options.analyze(input);
      return { raw: { tipo_rilevato: "luce", fornitore: "Test" } };
    },
    validateBill(raw) {
      return raw as { tipo_rilevato: unknown; [key: string]: unknown };
    },
    validatePayroll(raw) {
      return raw as { tipo_rilevato: unknown; [key: string]: unknown };
    },
    async enrichBill(validated) {
      return { ...validated, confronto_mercato: null };
    },
    now: () => options.now ?? new Date("2026-08-30T10:10:00.000Z"),
  };

  return {
    store,
    process: createDocumentAnalysisProcessor(deps),
    getAnalyzeCalls: () => analyzeCalls,
    getDownloadCalls: () => downloadCalls,
  };
}

test("due worker concorrenti elaborano lo stesso documento una sola volta", async () => {
  const harness = createHarness();

  const [first, second] = await Promise.all([
    harness.process("doc-1"),
    harness.process("doc-1"),
  ]);

  assert.equal([first, second].filter(Boolean).length, 1);
  assert.equal(harness.getAnalyzeCalls(), 1);
  assert.equal(harness.getDownloadCalls(), 1);
  assert.equal(harness.store.document?.status, AnalysisStatus.DONE);
});

test("gli errori tecnici ritentano tre volte e poi passano a ERROR", async () => {
  const harness = createHarness({
    analyze: async () => {
      throw new Error("provider temporaneamente non disponibile");
    },
  });

  assert.equal(await harness.process("doc-1"), false);
  assert.equal(harness.store.document?.status, AnalysisStatus.PENDING);
  assert.equal((harness.store.document?.analysis as { _job?: { attempts?: number } })._job?.attempts, 1);

  assert.equal(await harness.process("doc-1"), false);
  assert.equal(harness.store.document?.status, AnalysisStatus.PENDING);
  assert.equal((harness.store.document?.analysis as { _job?: { attempts?: number } })._job?.attempts, 2);

  assert.equal(await harness.process("doc-1"), false);
  assert.equal(harness.store.document?.status, AnalysisStatus.ERROR);
  assert.equal((harness.store.document?.analysis as { _job?: { attempts?: number } })._job?.attempts, 3);

  assert.equal(await harness.process("doc-1"), false);
  assert.equal(harness.getAnalyzeCalls(), 3);
});

test("un lease PROCESSING ancora valido non viene rubato da un altro worker", async () => {
  const now = new Date("2026-08-30T10:10:00.000Z");
  const harness = createHarness({
    now,
    document: pendingDocument({
      status: AnalysisStatus.PROCESSING,
      updatedAt: new Date(now.getTime() - ANALYSIS_LEASE_TIMEOUT_MS + 1_000),
      analysis: { _job: { attempts: 1, lastError: null } },
    }),
  });

  assert.equal(await harness.process("doc-1"), false);
  assert.equal(harness.getDownloadCalls(), 0);
  assert.equal(harness.getAnalyzeCalls(), 0);
  assert.equal(harness.store.document?.status, AnalysisStatus.PROCESSING);
});

test("un lease PROCESSING scaduto viene recuperato", async () => {
  const now = new Date("2026-08-30T10:10:00.000Z");
  const harness = createHarness({
    now,
    document: pendingDocument({
      status: AnalysisStatus.PROCESSING,
      updatedAt: new Date(now.getTime() - ANALYSIS_LEASE_TIMEOUT_MS - 1_000),
      analysis: { _job: { attempts: 1, lastError: "timeout" } },
    }),
  });

  assert.equal(await harness.process("doc-1"), true);
  assert.equal(harness.getAnalyzeCalls(), 1);
  assert.equal(harness.store.document?.status, AnalysisStatus.DONE);
});

test("documenti cancellati o senza file non toccano Storage né AI", async () => {
  const deleted = createHarness({ document: pendingDocument({ deletedAt: new Date() }) });
  assert.equal(await deleted.process("doc-1"), false);
  assert.equal(deleted.getDownloadCalls(), 0);
  assert.equal(deleted.getAnalyzeCalls(), 0);

  const withoutFile = createHarness({ document: pendingDocument({ filePath: null }) });
  assert.equal(await withoutFile.process("doc-1"), false);
  assert.equal(withoutFile.getDownloadCalls(), 0);
  assert.equal(withoutFile.getAnalyzeCalls(), 0);
});

test("un errore Storage torna PENDING e conserva il tentativo", async () => {
  const harness = createHarness({
    download: async () => {
      throw new Error("storage non disponibile");
    },
  });

  assert.equal(await harness.process("doc-1"), false);
  assert.equal(harness.getAnalyzeCalls(), 0);
  assert.equal(harness.store.document?.status, AnalysisStatus.PENDING);
  assert.equal((harness.store.document?.analysis as { _job?: { attempts?: number } })._job?.attempts, 1);
});
