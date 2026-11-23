import assert from "node:assert/strict";
import test from "node:test";
import { applicableDsuDocumentSteps, dsuPreparation } from "../lib/pratiche/dsu-preparation.ts";
import type { Workflow } from "../lib/pratiche/engine.ts";

const workflow: Workflow = {
  questions: [{ id: "extra", title: "Serve un documento aggiuntivo?", type: "boolean", required: true }],
  steps: [
    { id: "base", kind: "document", title: "Documento base", description: "", required: true },
    { id: "optional", kind: "document", title: "Documento facoltativo", description: "", required: false },
    { id: "additional", kind: "document", title: "Documento aggiuntivo", description: "", required: true, when: { questionId: "extra", equals: true } },
    { id: "review", kind: "task", title: "Controlla i dati", description: "", required: true },
  ],
};

test("il riepilogo aspetta le risposte richieste prima di proporre i documenti", () => {
  const summary = dsuPreparation(workflow, {}, [], []);
  assert.equal(summary.questions[0].id, "extra");
  assert.deepEqual(summary.documents, []);
  assert.deepEqual(summary.tasks, []);
});

test("disponibilità del file e completamento del passaggio sono indipendenti", () => {
  const summary = dsuPreparation(workflow, { extra: true }, ["base"], ["additional"]);
  assert.deepEqual(summary.documents.map(({ id, required, done, linked }) => [id, required, done, linked]), [
    ["base", true, true, false],
    ["optional", false, false, false],
    ["additional", true, false, true],
  ]);
  assert.deepEqual(summary.tasks.map(({ id }) => id), ["review"]);
});

test("nasconde requisiti esclusi e distingue collegamenti non disponibili", () => {
  assert.deepEqual(applicableDsuDocumentSteps(workflow, { extra: false }), ["base", "optional"]);
  const summary = dsuPreparation(workflow, { extra: false }, [], null);
  assert.deepEqual(summary.documents.map(({ id, linked }) => [id, linked]), [["base", null], ["optional", null]]);
});
