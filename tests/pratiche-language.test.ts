import assert from "node:assert/strict";
import test from "node:test";
import { plainPreparation, plainWorkflow } from "../lib/pratiche/plain-language.ts";
import type { Workflow } from "../lib/pratiche/engine.ts";

const workflow: Workflow = {
  questions: [
    { id: "tipo_trasferimento", title: "Quale trasferimento?", type: "single", required: true, blockedValues: ["altro"], options: [{ value: "altro", label: "Altro" }] },
    { id: "altri_maggiorenni", title: "Altri maggiorenni?", type: "boolean", required: true },
  ],
  steps: [
    { id: "dati_abitazione", title: "Titolo di occupazione", description: "Originale", kind: "document", required: true },
    { id: "convalida_maggiorenni", title: "Convalida", description: "Originale", kind: "task", required: true, when: { questionId: "altri_maggiorenni", equals: true } },
  ],
};

test("la lingua semplice lascia invariati valori, condizioni e obblighi", () => {
  const shown = plainWorkflow("pv_residenza_1", workflow);
  assert.notEqual(shown.questions[0].title, workflow.questions[0].title);
  assert.notEqual(shown.steps[0].title, workflow.steps[0].title);
  assert.deepEqual(shown.questions.map(({ id, type, required, blockedValues, options, when }) => ({ id, type, required, blockedValues, values: options?.map(({ value }) => value), when })),
    workflow.questions.map(({ id, type, required, blockedValues, options, when }) => ({ id, type, required, blockedValues, values: options?.map(({ value }) => value), when })));
  assert.deepEqual(shown.steps.map(({ id, kind, required, when, url }) => ({ id, kind, required, when, url })),
    workflow.steps.map(({ id, kind, required, when, url }) => ({ id, kind, required, when, url })));
  assert.deepEqual(workflow.steps[0].title, "Titolo di occupazione");
});

test("le tre guide pilota mostrano elenchi concreti; le altre usano i documenti pubblicati", () => {
  for (const id of ["pv_residenza_1", "pv_certificati_1", "pv_isee_1"]) {
    const preparation = plainPreparation(id, workflow);
    assert.ok(preparation && preparation.items.length >= 3);
    assert.ok(preparation.items.every((item) => item.title && item.detail));
  }
  assert.deepEqual(plainPreparation("another_version", workflow)?.items, [{ title: "Titolo di occupazione", detail: "Originale" }]);
  assert.equal(plainPreparation("another_version", { questions: [], steps: [workflow.steps[1], { ...workflow.steps[0], when: { questionId: "altri_maggiorenni", equals: true } }] })?.items[0].title, "In alcuni casi: Titolo di occupazione");
  assert.equal(plainPreparation("another_version", { questions: [], steps: [] }), null);
});
