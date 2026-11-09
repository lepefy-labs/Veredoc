import assert from "node:assert/strict";
import test from "node:test";
import { applies, isOfficialUrl, parseWorkflow, progress, validateAnswer, type Workflow } from "../lib/pratiche/engine.ts";

const workflow: Workflow = {
  questions: [
    { id: "recipient", title: "Destinatario", type: "single", required: true, options: [{ value: "self", label: "Me" }, { value: "third", label: "Terzo" }], blockedValues: ["third"] },
    { id: "family", title: "Famiglia", type: "boolean", required: true, when: { questionId: "recipient", equals: "self" } },
  ],
  steps: [
    { id: "base", title: "Base", description: "Prepara", kind: "task", required: true },
    { id: "extra", title: "Extra", description: "Prepara", kind: "document", required: true, when: { questionId: "family", equals: true } },
    { id: "portal", title: "Portale", description: "Accedi", kind: "portal", required: false, url: "https://www.inps.it/" },
  ],
};

test("valida il workflow e rifiuta identificatori duplicati", () => {
  assert.deepEqual(parseWorkflow(workflow), workflow);
  assert.throws(() => parseWorkflow({ questions: workflow.questions, steps: [{ ...workflow.steps[0], id: "recipient" }] }));
});

test("valida risposte e opzioni senza accettare input arbitrari", () => {
  assert.equal(validateAnswer(workflow.questions[0], "self"), "self");
  assert.throws(() => validateAnswer(workflow.questions[0], "admin"));
  assert.throws(() => validateAnswer(workflow.questions[1], "true"));
});

test("applica condizioni e passaggi non applicabili", () => {
  const state = progress(workflow, { recipient: "self", family: false }, new Set(["base"]));
  assert.equal(state.ready, true);
  assert.equal(state.steps.length, 2);
  assert.equal(applies(workflow.steps[1].when, { family: true }), true);
});

test("blocca i casi fuori ambito anche se le attività sono complete", () => {
  const state = progress(workflow, { recipient: "third" }, new Set(["base", "extra"]));
  assert.equal(state.blocked, true);
  assert.equal(state.ready, false);
});

test("accetta solo URL HTTPS su domini istituzionali consentiti", () => {
  assert.equal(isOfficialUrl("https://www.inps.it/it/"), true);
  assert.equal(isOfficialUrl("https://inps.it.evil.example/"), false);
  assert.equal(isOfficialUrl("http://www.inps.it/"), false);
  assert.equal(isOfficialUrl("https://evil.example@www.inps.it/"), false);
});
