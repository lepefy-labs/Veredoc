import assert from "node:assert/strict";
import test from "node:test";
import { PGlite } from "@electric-sql/pglite";
import type { Prisma } from "@prisma/client";
import {
  claimAnalysisSql,
  completeAnalysisSql,
  exhaustAnalysisSql,
  releaseAnalysisSql,
  requeueAnalysisSql,
  saveExtractionSql,
} from "../lib/jobs/analysis-sql.ts";

// Postgres reale in-process con lo stesso trigger di produzione
// (supabase/migrations/001_schema.sql): updatedAt viene riscritto a ogni UPDATE.
const SCHEMA = `
  CREATE TYPE "AnalysisStatus" AS ENUM ('PENDING', 'PROCESSING', 'AWAITING_CONFIRMATION', 'DONE', 'ERROR', 'DELETED');
  CREATE TYPE "DocumentType" AS ENUM ('BOLLETTA_LUCE', 'BOLLETTA_GAS', 'BOLLETTA_INTERNET', 'BUSTA_PAGA');
  CREATE TABLE "Document" (
    "id" TEXT PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "type" "DocumentType" NOT NULL,
    "filePath" TEXT,
    "status" "AnalysisStatus" NOT NULL DEFAULT 'PENDING',
    "rawExtracted" JSONB,
    "analysis" JSONB,
    "typeCorrected" BOOLEAN NOT NULL DEFAULT false,
    "typeSelectedByUser" TEXT,
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "deletedAt" TIMESTAMPTZ
  );
  CREATE OR REPLACE FUNCTION update_updated_at() RETURNS TRIGGER AS $$
  BEGIN
    NEW."updatedAt" = NOW();
    RETURN NEW;
  END;
  $$ LANGUAGE plpgsql;
  CREATE TRIGGER "Document_updatedAt_trigger" BEFORE UPDATE ON "Document"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
`;

const LEASE_MS = 6 * 60 * 1000;

const openDatabases: PGlite[] = [];

async function createDb() {
  const db = new PGlite();
  openDatabases.push(db);
  await db.exec(SCHEMA);
  return db;
}

test.after(async () => {
  await Promise.all(openDatabases.map((db) => db.close()));
});

async function run(db: PGlite, query: Prisma.Sql): Promise<number> {
  const result = await db.query(query.text, query.values as unknown[]);
  return result.affectedRows ?? 0;
}

async function row(db: PGlite, id = "doc-1") {
  const result = await db.query<{
    status: string;
    type: string;
    analysis: Record<string, unknown> | null;
    rawExtracted: unknown;
    updatedAt: Date;
  }>(`SELECT status, type, analysis, "rawExtracted", "updatedAt" FROM "Document" WHERE id = $1`, [id]);
  return result.rows[0];
}

async function insertPending(db: PGlite, overrides: { analysis?: unknown; status?: string; updatedAgo?: string } = {}) {
  await db.query(
    `INSERT INTO "Document" (id, "userId", type, "filePath", status, analysis, "updatedAt")
     VALUES ('doc-1', 'user-1', 'BOLLETTA_LUCE', 'uploads/user-1/doc.pdf', $1::"AnalysisStatus", $2::jsonb, now() - $3::interval)`,
    [overrides.status ?? "PENDING", JSON.stringify(overrides.analysis ?? null), overrides.updatedAgo ?? "0 seconds"]
  );
}

function claim(expectedAttempts: number, leaseId: string) {
  return claimAnalysisSql({
    documentId: "doc-1",
    expectedAttempts,
    leaseTimeoutMs: LEASE_MS,
    job: { attempts: expectedAttempts + 1, leaseId, phase: "claimed" },
  });
}

test("SQL: causa originale — un lease basato su updatedAt non può funzionare con il trigger", async () => {
  const db = await createDb();
  await insertPending(db);
  // In produzione il Date del worker e NOW() del DB differiscono sempre (latenza, microsecondi:
  // osservato updatedAt = 19:55:12.886302). PGlite usa l'orologio JS, quindi lo scarto è esplicito.
  const leaseTime = new Date(Date.now() - 1_500);

  // Vecchio claim: imposta updatedAt = leaseTime, ma il trigger lo sostituisce con NOW() del DB.
  await db.query(`UPDATE "Document" SET status = 'PROCESSING', "updatedAt" = $1 WHERE id = 'doc-1'`, [leaseTime]);
  // Vecchio complete: WHERE updatedAt = leaseTime → zero righe, in silenzio.
  const result = await db.query(
    `UPDATE "Document" SET status = 'DONE' WHERE id = 'doc-1' AND status = 'PROCESSING' AND "updatedAt" = $1`,
    [leaseTime]
  );

  assert.equal(result.affectedRows, 0);
  assert.equal((await row(db)).status, "PROCESSING");
});

test("SQL: claim + checkpoint + complete funzionano nonostante il trigger su updatedAt", async () => {
  const db = await createDb();
  await insertPending(db);

  assert.equal(await run(db, claim(0, "lease-a")), 1);
  const claimed = await row(db);
  assert.equal(claimed.status, "PROCESSING");

  const raw = { tipo_rilevato: "luce", fornitore: "Sintetico" };
  assert.equal(await run(db, saveExtractionSql({
    documentId: "doc-1",
    leaseId: "lease-a",
    type: "BOLLETTA_LUCE",
    rawExtracted: raw,
    job: { attempts: 1, leaseId: "lease-a", extracted: true },
  })), 1);

  assert.equal(await run(db, completeAnalysisSql({
    documentId: "doc-1",
    leaseId: "lease-a",
    type: "BOLLETTA_LUCE",
    rawExtracted: raw,
    analysis: { ...raw, confronto_mercato: null },
  })), 1);

  const done = await row(db);
  assert.equal(done.status, "DONE");
  assert.deepEqual(done.rawExtracted, raw);
  assert.equal(done.analysis?.fornitore, "Sintetico");
});

test("SQL: il secondo claim concorrente non modifica righe", async () => {
  const db = await createDb();
  await insertPending(db);

  assert.equal(await run(db, claim(0, "lease-a")), 1);
  assert.equal(await run(db, claim(0, "lease-b")), 0);
  assert.equal(((await row(db)).analysis!._job as { leaseId: string }).leaseId, "lease-a");
});

test("SQL: un lease attivo non è recuperabile, uno scaduto sì (orologio del DB)", async () => {
  const fresh = await createDb();
  await insertPending(fresh, { status: "PROCESSING", analysis: { _job: { attempts: 1, leaseId: "old" } }, updatedAgo: "1 minute" });
  assert.equal(await run(fresh, claim(1, "lease-new")), 0);

  const stale = await createDb();
  await insertPending(stale, { status: "PROCESSING", analysis: { _job: { attempts: 1, leaseId: "old" } }, updatedAgo: "7 minutes" });
  assert.equal(await run(stale, claim(1, "lease-new")), 1);
  assert.equal(((await row(stale)).analysis!._job as { attempts: number }).attempts, 2);
});

test("SQL: le scritture con lease scaduto o diverso modificano zero righe e non toccano i dati", async () => {
  const db = await createDb();
  await insertPending(db);
  await run(db, claim(0, "lease-a"));

  assert.equal(await run(db, completeAnalysisSql({
    documentId: "doc-1",
    leaseId: "lease-sbagliato",
    type: "BOLLETTA_LUCE",
    rawExtracted: {},
    analysis: { sovrascritto: true },
  })), 0);
  assert.equal((await row(db)).status, "PROCESSING");

  await run(db, completeAnalysisSql({
    documentId: "doc-1",
    leaseId: "lease-a",
    type: "BOLLETTA_LUCE",
    rawExtracted: { ok: true },
    analysis: { ok: true },
  }));
  assert.equal(await run(db, releaseAnalysisSql({
    documentId: "doc-1",
    leaseId: "lease-a",
    status: "PENDING",
    analysis: { _job: { attempts: 1 } },
  })), 0, "un DONE non torna mai PENDING");
  assert.deepEqual((await row(db)).analysis, { ok: true });
});

test("SQL: il documento eliminato non viene né rivendicato né aggiornato", async () => {
  const db = await createDb();
  await insertPending(db);
  await run(db, claim(0, "lease-a"));
  await db.query(`UPDATE "Document" SET status = 'DELETED', "deletedAt" = now(), analysis = NULL WHERE id = 'doc-1'`);

  assert.equal(await run(db, saveExtractionSql({
    documentId: "doc-1",
    leaseId: "lease-a",
    type: "BOLLETTA_LUCE",
    rawExtracted: { x: 1 },
    job: { attempts: 1 },
  })), 0);
  assert.equal(await run(db, claim(0, "lease-b")), 0);
  assert.equal((await row(db)).rawExtracted, null);
});

test("SQL: tentativi esauriti chiudono in ERROR solo documenti non in lavorazione", async () => {
  const db = await createDb();
  await insertPending(db, { status: "PROCESSING", analysis: { _job: { attempts: 3 } }, updatedAgo: "1 minute" });
  const exhaust = exhaustAnalysisSql({
    documentId: "doc-1",
    expectedAttempts: 3,
    leaseTimeoutMs: LEASE_MS,
    analysis: { error: "attempts_exhausted" },
  });
  assert.equal(await run(db, exhaust), 0, "lease ancora attivo");

  await db.query(`ALTER TABLE "Document" DISABLE TRIGGER "Document_updatedAt_trigger"`);
  await db.query(`UPDATE "Document" SET "updatedAt" = now() - interval '7 minutes'`);
  await db.query(`ALTER TABLE "Document" ENABLE TRIGGER "Document_updatedAt_trigger"`);
  assert.equal(await run(db, exhaust), 1);
  assert.equal((await row(db)).status, "ERROR");
});

test("SQL: il retry manuale riaccoda una sola volta per conteggio", async () => {
  const db = await createDb();
  await insertPending(db, { status: "ERROR", analysis: { error: "ai_provider_failed", _job: { attempts: 3 } } });
  const requeue = requeueAnalysisSql({
    documentId: "doc-1",
    userId: "user-1",
    expectedManualRetries: 0,
    analysis: { _job: { attempts: 0, manualRetries: 1 } },
  });

  assert.equal(await run(db, requeueAnalysisSql({ documentId: "doc-1", userId: "altro-utente", expectedManualRetries: 0, analysis: {} })), 0);
  assert.equal(await run(db, requeue), 1);
  assert.equal(await run(db, requeue), 0);
  assert.equal((await row(db)).status, "PENDING");
});
