import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";

test("il collegamento richiede lo stesso proprietario e profilo, e scompare dopo revoca del file", async () => {
  const db = new PGlite();
  try {
    await db.exec(`
      CREATE ROLE anon;
      CREATE ROLE authenticated;
      CREATE TABLE "User" ("id" TEXT PRIMARY KEY);
      CREATE TABLE "AnalysisProfile" ("id" TEXT PRIMARY KEY, "userId" TEXT NOT NULL REFERENCES "User"("id"));
      CREATE TABLE "Document" ("id" TEXT PRIMARY KEY, "userId" TEXT NOT NULL, "profileId" TEXT NOT NULL,
        "filePath" TEXT, "status" TEXT NOT NULL, "deletedAt" TIMESTAMP);
    `);
    await db.exec(await readFile(new URL("../supabase/migrations/006_pratiche.sql", import.meta.url), "utf8"));
    await db.exec(await readFile(new URL("../supabase/seeds/pratiche_pilots.sql", import.meta.url), "utf8"));
    const migration = await readFile(new URL("../supabase/migrations/007_case_evidence.sql", import.meta.url), "utf8");
    await db.exec(migration);
    await db.exec(migration);

    // La versione di test possiede un requisito documentale identificabile.
    await db.exec(`
      INSERT INTO "User" VALUES ('u1'), ('u2');
      INSERT INTO "AnalysisProfile" VALUES ('p1', 'u1'), ('p2', 'u2'), ('p3', 'u1');
      INSERT INTO "Document" VALUES ('d1', 'u1', 'p1', 'test.pdf', 'DONE', null),
        ('d2', 'u2', 'p2', 'foreign.pdf', 'DONE', null),
        ('d3', 'u1', 'p3', 'different-profile.pdf', 'DONE', null),
        ('d4', 'u1', 'p1', null, 'DONE', null);
      INSERT INTO "UserCase" ("id", "userId", "profileId", "procedureVersionId", "title", "updatedAt")
      VALUES ('c1', 'u1', 'p1', 'pv_isee_1', 'Test', now()), ('c2', 'u1', 'p1', 'pv_isee_1', 'Test', now());
    `);
    const steps = await db.query<{ id: string }>(`SELECT item->>'id' AS id
      FROM "ProcedureVersion", jsonb_array_elements("definition"->'steps') AS item
      WHERE "ProcedureVersion"."id" = 'pv_isee_1' AND item->>'kind' = 'document' LIMIT 1`);
    const step = steps.rows[0]?.id;
    assert.ok(step);
    const link = (caseId: string, stepId: string, documentId: string) => db.query(
      'INSERT INTO "CaseDocument" ("caseId", "stepId", "documentId") VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
      [caseId, stepId, documentId],
    );
    await assert.rejects(link("c1", step, "d2"), /Documento non disponibile/);
    await assert.rejects(link("c1", step, "d3"), /Documento non disponibile/);
    await assert.rejects(link("c1", step, "d4"), /Documento non disponibile/);
    await assert.rejects(link("c1", "inesistente", "d1"), /Requisito documentale non valido/);
    await link("c1", step, "d1");
    await link("c1", step, "d1");
    await link("c2", step, "d1");

    const count = async () => (await db.query<{ count: number }>('SELECT count(*)::int AS count FROM "CaseDocument"')).rows[0].count;
    assert.equal(await count(), 2);
    const permissions = await db.query<{ rls: boolean; read: boolean }>(`
      SELECT relrowsecurity AS rls, has_table_privilege('authenticated', oid, 'SELECT') AS read
      FROM pg_class WHERE relname = 'CaseDocument'
    `);
    assert.deepEqual(permissions.rows, [{ rls: true, read: false }]);

    await db.exec(`UPDATE "Document" SET "profileId" = 'p3' WHERE "id" = 'd1'`);
    assert.equal(await count(), 0);
    await db.exec(`UPDATE "Document" SET "profileId" = 'p1' WHERE "id" = 'd1'`);
    await link("c1", step, "d1");
    await db.exec(`UPDATE "Document" SET "status" = 'DELETED' WHERE "id" = 'd1'`);
    assert.equal(await count(), 0);
    await assert.rejects(link("c1", step, "d1"), /Documento non disponibile/);
  } finally {
    await db.close();
  }
});
