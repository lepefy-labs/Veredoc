import { strict as assert } from "node:assert";
import { test } from "node:test";
import { parseWorkflow } from "../lib/pratiche/engine.ts";
import { requestsPublicGuide, workflowGuide } from "../lib/pratiche/workflow-guide.ts";

const definition = {
  publicGuide: true,
  questions: [{ id: "opzione", title: "Serve il documento?", type: "boolean", required: true }],
  steps: [
    { id: "prepara", title: "Prepara i dati", description: "Raccogli le informazioni.", kind: "task", required: true },
    { id: "allegato", title: "Raccogli l’allegato", description: "Leggi le istruzioni.", kind: "document", required: true, when: { questionId: "opzione", equals: true } },
    { id: "portale", title: "Vai al portale", description: "Presenta sul servizio ufficiale.", kind: "portal", required: false, url: "https://www.inps.it/" },
  ],
};

test("la guida generata deriva documenti, passaggi e portale dal workflow", () => {
  assert.equal(requestsPublicGuide(definition), true);
  assert.equal(requestsPublicGuide({ ...definition, publicGuide: "true" }), false);
  const guide = workflowGuide(parseWorkflow(definition), [{ title: "INPS", url: "https://www.inps.it/" }]);
  assert.deepEqual(guide?.documents, [{ title: "Raccogli l’allegato", detail: "Quando si applica al tuo caso. Leggi le istruzioni." }]);
  assert.deepEqual(guide?.steps, [{ title: "Prepara i dati", detail: "Raccogli le informazioni." }]);
  assert.equal(guide?.link.href, "https://www.inps.it/");
});

test("senza fonte o senza portale generale non viene generata una guida", () => {
  const sources = [{ title: "INPS", url: "https://www.inps.it/" }];
  assert.equal(workflowGuide(parseWorkflow(definition), []), undefined);
  const workflow = parseWorkflow({ ...definition, steps: definition.steps.map((step) =>
    step.kind === "portal" ? { ...step, when: { questionId: "opzione", equals: true } } : step) });
  assert.equal(workflowGuide(workflow, sources), undefined);
});
