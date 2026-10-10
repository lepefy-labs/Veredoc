import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { PGlite } from "@electric-sql/pglite";
import type { Prisma } from "@prisma/client";
import { claimAnalysisSql, completeAnalysisSql, exhaustAnalysisSql } from "../lib/jobs/analysis-sql.ts";
import {
  claimNotificationsSql,
  enqueueDelayedNoticesSql,
  finishNotificationSql,
  markSendStartedSql,
  markSentSql,
  purgeNotificationsSql,
  rescheduleNotificationSql,
  withOutboxEventSql,
} from "../lib/notifications/notification-sql.ts";

// Schema minimo di produzione + migrazione reale 003_notification_outbox.sql.
const BASE_SCHEMA = `
  CREATE TYPE "AnalysisStatus" AS ENUM ('PENDING', 'PROCESSING', 'AWAITING_CONFIRMATION', 'DONE', 'ERROR', 'DELETED');
  CREATE TYPE "DocumentType" AS ENUM ('BOLLETTA_LUCE', 'BOLLETTA_GAS', 'BOLLETTA_INTERNET', 'BUSTA_PAGA');
  CREATE TABLE "User" ("id" TEXT PRIMARY KEY, "email" TEXT NOT NULL);
  CREATE TABLE "Document" (
    "id" TEXT PRIMARY KEY,
    "userId" TEXT NOT NULL REFERENCES "User"("id"),
    "type" "DocumentType" NOT NULL,
    "filePath" TEXT,
    "status" "AnalysisStatus" NOT NULL DEFAULT 'PENDING',
    "rawExtracted" JSONB,
    "analysis" JSONB,
    "typeCorrected" BOOLEAN NOT NULL DEFAULT false,
    "typeSelectedByUser" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "deletedAt" TIMESTAMPTZ
  );
`;
const MIGRATION = readFileSync(new URL("../supabase/migrations/003_notification_outbox.sql", import.meta.url), "utf8");
const LEASE_MS = 6 * 60 * 1000;

const openDatabases: PGlite[] = [];

async function createDb() {
  const db = new PGlite();
  openDatabases.push(db);
  await db.exec(BASE_SCHEMA);
  await db.exec(MIGRATION);
  // La migrazione è idempotente: una seconda esecuzione non fallisce.
  await db.exec(MIGRATION);
  await db.query(`INSERT INTO "User" (id, email) VALUES ('user-1', 'utente@example.com')`);
  return db;
}

test.after(async () => {
  await Promise.all(openDatabases.map((db) => db.close()));
});

async function exec(db: PGlite, query: Prisma.Sql): Promise<number> {
  const result = await db.query(query.text, query.values as unknown[]);
  return result.affectedRows ?? 0;
}

async function rowsOf(db: PGlite, query: Prisma.Sql): Promise<number> {
  const result = await db.query<{ rows: number }>(query.text, query.values as unknown[]);
  return Number(result.rows[0]?.rows ?? 0);
}

async function select<T>(db: PGlite, query: Prisma.Sql): Promise<T[]> {
  const result = await db.query<T>(query.text, query.values as unknown[]);
  return result.rows;
}

async function insertDocument(db: PGlite, options: {
  id?: string;
  status?: string;
  analysis?: unknown;
  createdAgo?: string;
  updatedAgo?: string;
  deleted?: boolean;
} = {}) {
  await db.query(
    `INSERT INTO "Document" (id, "userId", type, "filePath", status, analysis, "createdAt", "updatedAt", "deletedAt")
     VALUES ($1, 'user-1', 'BOLLETTA_LUCE', 'uploads/user-1/doc.pdf', $2::"AnalysisStatus", $3::jsonb,
             now() - $4::interval, now() - $5::interval, CASE WHEN $6 THEN now() ELSE NULL END)`,
    [
      options.id ?? "doc-1",
      options.status ?? "PENDING",
      JSON.stringify(options.analysis ?? null),
      options.createdAgo ?? "0 seconds",
      options.updatedAgo ?? options.createdAgo ?? "0 seconds",
      options.deleted ?? false,
    ]
  );
}

async function outbox(db: PGlite) {
  const result = await db.query<{
    id: string;
    eventType: string;
    eventKey: string;
    status: string;
    analysisCycle: number;
    attempts: number;
    lastErrorCode: string | null;
    ambiguousSince: Date | null;
    lastSendStartedAt: Date | null;
    providerMessageId: string | null;
  }>(`SELECT id, "eventType", "eventKey", status, "analysisCycle", attempts, "lastErrorCode", "ambiguousSince",
             "lastSendStartedAt", "providerMessageId"
      FROM "NotificationOutbox" ORDER BY "createdAt", "eventKey"`);
  return result.rows;
}

async function claimAndComplete(db: PGlite, leaseId: string, cycle = 0, expectedAttempts = 0) {
  assert.equal(await exec(db, claimAnalysisSql({
    documentId: "doc-1",
    expectedAttempts,
    leaseTimeoutMs: LEASE_MS,
    job: { attempts: expectedAttempts + 1, leaseId, manualRetries: cycle },
  })), 1);
  return rowsOf(db, withOutboxEventSql(completeAnalysisSql({
    documentId: "doc-1",
    leaseId,
    type: "BOLLETTA_LUCE",
    rawExtracted: { tipo_rilevato: "luce" },
    analysis: { tipo: "luce" },
  }), "doc-1", { eventType: "ANALYSIS_COMPLETED", cycle }));
}

test("outbox: DONE e evento ANALYSIS_COMPLETED nascono nella stessa istruzione", async () => {
  const db = await createDb();
  await insertDocument(db);

  assert.equal(await claimAndComplete(db, "lease-a"), 1);

  const [doc] = (await db.query<{ status: string }>(`SELECT status FROM "Document"`)).rows;
  assert.equal(doc.status, "DONE");
  const events = await outbox(db);
  assert.equal(events.length, 1);
  assert.equal(events[0].eventType, "ANALYSIS_COMPLETED");
  assert.equal(events[0].eventKey, "analysis_completed:doc-1:0");
  assert.equal(events[0].status, "PENDING");
  assert.match(events[0].id, /^[0-9a-f-]{36}$/);
});

test("outbox: un worker con lease perso non porta a DONE e non crea eventi", async () => {
  const db = await createDb();
  await insertDocument(db);
  assert.equal(await claimAndComplete(db, "lease-a"), 1);

  // Secondo worker (lease sottratto/scaduto): l'UPDATE non trova righe, l'INSERT non parte.
  const rows = await rowsOf(db, withOutboxEventSql(completeAnalysisSql({
    documentId: "doc-1",
    leaseId: "lease-b",
    type: "BOLLETTA_LUCE",
    rawExtracted: {},
    analysis: {},
  }), "doc-1", { eventType: "ANALYSIS_COMPLETED", cycle: 0 }));

  assert.equal(rows, 0);
  assert.equal((await outbox(db)).length, 1);
});

test("outbox: eventKey unico — un evento già presente non viene duplicato", async () => {
  const db = await createDb();
  await insertDocument(db);
  await db.query(
    `INSERT INTO "NotificationOutbox" (id, "userId", "documentId", "eventType", "eventKey", "analysisCycle")
     VALUES ('00000000-0000-4000-8000-000000000001', 'user-1', 'doc-1', 'ANALYSIS_COMPLETED', 'analysis_completed:doc-1:0', 0)`
  );

  // La transizione riesce comunque: il conflitto non blocca l'analisi.
  assert.equal(await claimAndComplete(db, "lease-a"), 1);
  assert.equal((await outbox(db)).length, 1);
});

test("outbox: la riprova manuale (nuovo ciclo) genera un nuovo evento legittimo", async () => {
  const db = await createDb();
  await insertDocument(db, { status: "ERROR", analysis: { _job: { attempts: 3, manualRetries: 0 } } });
  await db.query(
    `INSERT INTO "NotificationOutbox" (id, "userId", "documentId", "eventType", "eventKey", "analysisCycle", status)
     VALUES ('00000000-0000-4000-8000-000000000001', 'user-1', 'doc-1', 'ANALYSIS_FAILED', 'analysis_failed:doc-1:0', 0, 'SENT')`
  );
  await db.query(`UPDATE "Document" SET status = 'PENDING', analysis = '{"_job":{"attempts":0,"manualRetries":1}}'`);

  assert.equal(await claimAndComplete(db, "lease-a", 1), 1);

  const keys = (await outbox(db)).map((event) => event.eventKey).sort();
  assert.deepEqual(keys, ["analysis_completed:doc-1:1", "analysis_failed:doc-1:0"]);
});

test("outbox: nessuna email retroattiva per documenti storici chiusi dal recovery", async () => {
  const db = await createDb();
  await insertDocument(db, { analysis: { _job: { attempts: 3 } }, createdAgo: "5 days", updatedAgo: "5 days" });

  const rows = await rowsOf(db, withOutboxEventSql(exhaustAnalysisSql({
    documentId: "doc-1",
    expectedAttempts: 3,
    leaseTimeoutMs: LEASE_MS,
    analysis: { error: "attempts_exhausted" },
  }), "doc-1", { eventType: "ANALYSIS_FAILED", cycle: 0 }));

  assert.equal(rows, 1);
  assert.equal((await outbox(db)).length, 0);
});

const DELAYED = { thresholdSeconds: 60, maxAgeSeconds: 1800, limit: 50 };

test("attesa: avviso solo dopo la soglia, una volta per ciclo, mai per documenti chiusi o eliminati", async () => {
  const db = await createDb();
  await insertDocument(db, { id: "doc-slow", createdAgo: "90 seconds", updatedAgo: "5 seconds", status: "PROCESSING" });
  await insertDocument(db, { id: "doc-fresh", createdAgo: "30 seconds" });
  await insertDocument(db, { id: "doc-done", createdAgo: "90 seconds", status: "DONE" });
  await insertDocument(db, { id: "doc-error", createdAgo: "90 seconds", status: "ERROR" });
  await insertDocument(db, { id: "doc-deleted", createdAgo: "90 seconds", deleted: true });
  await insertDocument(db, { id: "doc-old", createdAgo: "3 hours" });

  assert.equal(await exec(db, enqueueDelayedNoticesSql(DELAYED)), 1);
  assert.equal(await exec(db, enqueueDelayedNoticesSql(DELAYED)), 0);

  const events = await outbox(db);
  assert.deepEqual(events.map((event) => event.eventKey), ["analysis_delayed:doc-slow:0"]);
});

test("attesa: la soglia parte dall'inizio del ciclo, non da createdAt o updatedAt", async () => {
  const db = await createDb();
  const recentRetry = new Date(Date.now() - 20_000).toISOString();
  const olderRetry = new Date(Date.now() - 120_000).toISOString();
  await insertDocument(db, {
    id: "doc-retry-recent",
    createdAgo: "2 days",
    updatedAgo: "10 seconds",
    analysis: { _job: { attempts: 0, manualRetries: 1, cycleStartedAt: recentRetry } },
  });
  await insertDocument(db, {
    id: "doc-retry-old",
    createdAgo: "2 days",
    updatedAgo: "10 seconds",
    analysis: { _job: { attempts: 1, manualRetries: 2, cycleStartedAt: olderRetry } },
  });

  assert.equal(await exec(db, enqueueDelayedNoticesSql(DELAYED)), 1);
  assert.deepEqual((await outbox(db)).map((event) => event.eventKey), ["analysis_delayed:doc-retry-old:2"]);
});

async function insertEvent(db: PGlite, id: string, options: { status?: string; nextAttemptIn?: string; updatedAgo?: string } = {}) {
  await db.query(
    `INSERT INTO "NotificationOutbox" (id, "userId", "documentId", "eventType", "eventKey", "analysisCycle", status, "nextAttemptAt", "updatedAt")
     VALUES ($1, 'user-1', 'doc-1', 'ANALYSIS_COMPLETED', 'analysis_completed:doc-1:' || $1, 0,
             $2::"NotificationStatus", now() + $3::interval, now() - $4::interval)`,
    [id, options.status ?? "PENDING", options.nextAttemptIn ?? "0 seconds", options.updatedAgo ?? "0 seconds"]
  );
}

test("dispatcher SQL: claim atomico, nessuna riga reclamata due volte", async () => {
  const db = await createDb();
  await insertDocument(db);
  for (let index = 1; index <= 3; index++) await insertEvent(db, `00000000-0000-4000-8000-00000000000${index}`);

  const first = await select<{ id: string; attempts: number; previousStatus: string }>(
    db, claimNotificationsSql({ leaseId: "lease-1", leaseSeconds: 180, limit: 2 })
  );
  const second = await select<{ id: string }>(db, claimNotificationsSql({ leaseId: "lease-2", leaseSeconds: 180, limit: 10 }));
  const third = await select<{ id: string }>(db, claimNotificationsSql({ leaseId: "lease-3", leaseSeconds: 180, limit: 10 }));

  assert.equal(first.length, 2);
  assert.equal(second.length, 1);
  assert.equal(third.length, 0);
  assert.equal(new Set([...first, ...second].map((row) => row.id)).size, 3);
  assert.equal(first[0].attempts, 1);
  assert.equal(first[0].previousStatus, "PENDING");
});

test("dispatcher SQL: filtro per documento e righe non ancora dovute", async () => {
  const db = await createDb();
  await insertDocument(db);
  await insertDocument(db, { id: "doc-2" });
  await insertEvent(db, "00000000-0000-4000-8000-000000000001");
  await insertEvent(db, "00000000-0000-4000-8000-000000000002", { nextAttemptIn: "5 minutes" });
  await db.query(
    `INSERT INTO "NotificationOutbox" (id, "userId", "documentId", "eventType", "eventKey", "analysisCycle")
     VALUES ('00000000-0000-4000-8000-000000000003', 'user-1', 'doc-2', 'ANALYSIS_COMPLETED', 'analysis_completed:doc-2:0', 0)`
  );

  const rows = await select<{ id: string }>(db, claimNotificationsSql({ leaseId: "l", leaseSeconds: 180, limit: 10, documentId: "doc-1" }));
  assert.deepEqual(rows.map((row) => row.id), ["00000000-0000-4000-8000-000000000001"]);
});

test("dispatcher SQL: lease scaduto recuperabile con stato precedente SENDING; lease attivo no", async () => {
  const db = await createDb();
  await insertDocument(db);
  await insertEvent(db, "00000000-0000-4000-8000-000000000001");
  await select(db, claimNotificationsSql({ leaseId: "lease-1", leaseSeconds: 180, limit: 1 }));
  assert.equal(await exec(db, markSendStartedSql({ id: "00000000-0000-4000-8000-000000000001", leaseId: "lease-1", ambiguousSince: null })), 1);

  assert.equal((await select(db, claimNotificationsSql({ leaseId: "lease-2", leaseSeconds: 180, limit: 1 }))).length, 0);

  await db.query(`UPDATE "NotificationOutbox" SET "leaseExpiresAt" = now() - interval '1 second'`);
  const [recovered] = await select<{ previousStatus: string; attempts: number; lastSendStartedAt: Date | null }>(
    db, claimNotificationsSql({ leaseId: "lease-2", leaseSeconds: 180, limit: 1 })
  );
  assert.equal(recovered.previousStatus, "SENDING");
  assert.equal(recovered.attempts, 2);
  assert.ok(recovered.lastSendStartedAt);

  // Il vecchio worker non può più scrivere l'esito.
  assert.equal(await exec(db, markSentSql({ id: "00000000-0000-4000-8000-000000000001", leaseId: "lease-1", providerMessageId: "x" })), 0);
  assert.equal(await exec(db, markSentSql({ id: "00000000-0000-4000-8000-000000000001", leaseId: "lease-2", providerMessageId: "<msg@brevo>" })), 1);
  const [event] = await outbox(db);
  assert.equal(event.status, "SENT");
  assert.equal(event.providerMessageId, "<msg@brevo>");
});

test("dispatcher SQL: retry ambiguo conserva la finestra, retry pulito la azzera", async () => {
  const db = await createDb();
  await insertDocument(db);
  const id = "00000000-0000-4000-8000-000000000001";
  await insertEvent(db, id);

  await select(db, claimNotificationsSql({ leaseId: "l1", leaseSeconds: 180, limit: 1 }));
  await exec(db, markSendStartedSql({ id, leaseId: "l1", ambiguousSince: null }));
  assert.equal(await exec(db, rescheduleNotificationSql({ id, leaseId: "l1", delaySeconds: 60, errorCode: "provider_timeout", ambiguous: true })), 1);
  let [event] = await outbox(db);
  assert.equal(event.status, "PENDING");
  assert.ok(event.ambiguousSince);
  assert.equal(event.lastErrorCode, "provider_timeout");

  await db.query(`UPDATE "NotificationOutbox" SET "nextAttemptAt" = now()`);
  await select(db, claimNotificationsSql({ leaseId: "l2", leaseSeconds: 180, limit: 1 }));
  await exec(db, rescheduleNotificationSql({ id, leaseId: "l2", delaySeconds: 60, errorCode: "provider_rate_limited", ambiguous: false }));
  [event] = await outbox(db);
  assert.equal(event.lastSendStartedAt, null);
  assert.ok(event.ambiguousSince, "la finestra ambigua iniziale resta registrata");

  await db.query(`UPDATE "NotificationOutbox" SET "nextAttemptAt" = now()`);
  await select(db, claimNotificationsSql({ leaseId: "l3", leaseSeconds: 180, limit: 1 }));
  assert.equal(await exec(db, finishNotificationSql({ id, leaseId: "l3", status: "CANCELLED", errorCode: "document_deleted" })), 1);
  [event] = await outbox(db);
  assert.equal(event.status, "CANCELLED");
  assert.equal(event.attempts, 3);
});

test("retention e cascade: righe chiuse vecchie eliminate, documento cancellato rimuove i suoi eventi", async () => {
  const db = await createDb();
  await insertDocument(db);
  await insertEvent(db, "00000000-0000-4000-8000-000000000001", { status: "SENT", updatedAgo: "100 days" });
  await insertEvent(db, "00000000-0000-4000-8000-000000000002");

  assert.equal(await exec(db, purgeNotificationsSql({ retentionDays: 90, limit: 500 })), 1);
  assert.equal((await outbox(db)).length, 1);

  await db.query(`DELETE FROM "Document" WHERE id = 'doc-1'`);
  assert.equal((await outbox(db)).length, 0);
});
