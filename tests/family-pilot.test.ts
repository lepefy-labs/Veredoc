import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { PGlite } from "@electric-sql/pglite";
import { isOfficialUrl, parseWorkflow, progress, type Answer } from "../lib/pratiche/engine.ts";

const pilots = new Map<string, string>([
  ["preparazione-dsu-isee", "inps.it"],
  ["isee-corrente", "inps.it"],
  ["assegno-unico", "inps.it"],
  ["bonus-asilo-nido", "inps.it"],
  ["bonus-sociale-luce-gas-acqua", "arera.it"],
]);

test("i seed ISEE e famiglia preparano i documenti e indicano un canale ufficiale", async () => {
  const db = new PGlite();
  try {
    await db.exec('CREATE TABLE "User" ("id" text PRIMARY KEY); CREATE TABLE "AnalysisProfile" ("id" text PRIMARY KEY, "userId" text NOT NULL REFERENCES "User"("id"));');
    const scripts = [
      "migrations/006_pratiche.sql",
      "seeds/pratiche_pilots.sql",
      "seeds/pratiche_famiglia_2026-11-22.sql",
      "seeds/pratiche_guide_2026-11-23.sql",
    ];
    for (const script of scripts) await db.exec(await readFile(new URL(`../supabase/${script}`, import.meta.url), "utf8"));
    for (const [slug, authority] of pilots) {
      const { rows } = await db.query<{ definition: unknown; steps: string[] }>(`
        SELECT v."definition", array_agg(DISTINCT item) AS steps
          FROM "ProcedureDefinition" p
          JOIN "ProcedureVersion" v ON v."procedureId" = p."id"
          JOIN "ProcedureCitation" c ON c."procedureVersionId" = v."id"
          CROSS JOIN LATERAL unnest(c."instructionIds") AS item
         WHERE p."slug" = $1
         GROUP BY v."id"
      `, [slug]);
      assert.equal(rows.length, 1, slug);
      const workflow = parseWorkflow(rows[0].definition);
      const allowed = new Set(rows[0].steps);
      for (const { id } of [...workflow.questions, ...workflow.steps]) assert.ok(allowed.has(id), `${slug}: ${id}`);
      const answers: Record<string, Answer> = slug === "preparazione-dsu-isee"
        ? { isee_specifico: true, precompilata: false } : {};
      const pending = progress(workflow, answers, new Set());
      assert.equal(pending.ready, false, slug);
      assert.ok(pending.missingSteps.some(({ kind }) => kind === "document"), slug);
      if (slug === "preparazione-dsu-isee") {
        assert.ok(pending.missingSteps.some(({ id }) => id === "verifica_isee_specifico"));
        assert.ok(!pending.steps.some(({ id }) => id === "autorizzazioni"));
      }
      const prepared = progress(workflow, answers, new Set(pending.missingSteps.map(({ id }) => id)));
      assert.equal(prepared.ready, true, slug);
      const url = prepared.steps.find(({ kind }) => kind === "portal")?.url;
      assert.ok(url && isOfficialUrl(url), slug);
      const host = new URL(url).hostname;
      assert.ok(host === authority || host.endsWith(`.${authority}`), slug);
    }
  } finally {
    await db.close();
  }
});
