import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { parseWorkflow } from "../lib/pratiche/engine.ts";

test("migrazione Pratiche, bozze e vincoli di immutabilità", async () => {
  const db = new PGlite();
  try {
    await db.exec('CREATE TABLE "User" ("id" TEXT PRIMARY KEY); CREATE TABLE "AnalysisProfile" ("id" TEXT PRIMARY KEY, "userId" TEXT NOT NULL REFERENCES "User"("id"));');
    await db.exec(await readFile(new URL("../supabase/migrations/006_pratiche.sql", import.meta.url), "utf8"));
    await db.exec(await readFile(new URL("../supabase/seeds/pratiche_pilots.sql", import.meta.url), "utf8"));
    const rows = await db.query<{ status: string }>('SELECT "status" FROM "ProcedureVersion" ORDER BY "id"');
    assert.equal(rows.rows.length, 3);
    assert.ok(rows.rows.every((row) => row.status === "DRAFT"));
    const definitions = await db.query<{ definition: unknown }>('SELECT "definition" FROM "ProcedureVersion"');
    for (const version of definitions.rows) assert.ok(parseWorkflow(version.definition).steps.length > 0);
    await db.exec('INSERT INTO "User" ("id") VALUES (\'u1\'), (\'u2\'); INSERT INTO "AnalysisProfile" ("id", "userId") VALUES (\'p1\', \'u1\');');
    await assert.rejects(db.exec('INSERT INTO "UserCase" ("id", "userId", "profileId", "procedureVersionId", "title", "updatedAt") VALUES (\'c1\', \'u2\', \'p1\', \'pv_certificati_1\', \'Test\', now())'));
    await db.exec('UPDATE "KnowledgeRevision" SET "status" = \'VERIFIED\' WHERE "id" = \'kr_anpr_certificati_1\';');
    await assert.rejects(db.exec('UPDATE "KnowledgeRevision" SET "content" = \'altered\' WHERE "id" = \'kr_anpr_certificati_1\';'));
    await db.exec('UPDATE "ProcedureVersion" SET "status" = \'PUBLISHED\', "approvedAt" = now() WHERE "id" = \'pv_certificati_1\';');
    await assert.rejects(db.exec('UPDATE "ProcedureVersion" SET "definition" = \'{}\'::jsonb WHERE "id" = \'pv_certificati_1\';'));
    await assert.rejects(db.exec('DELETE FROM "ProcedureCitation" WHERE "id" = \'pc_certificati_1\';'));
    const rls = await db.query<{ relrowsecurity: boolean }>('SELECT relrowsecurity FROM pg_class WHERE relname = \'UserCase\'');
    assert.equal(rls.rows[0]?.relrowsecurity, true);
  } finally { await db.close(); }
});
