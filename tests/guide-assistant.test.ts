import assert from "node:assert/strict";
import test from "node:test";
import { applyInstructionSelection, isAssistantTopic } from "../lib/pratiche/guide-assistant.ts";

const instructions = [
  { title: "Prepara il documento", detail: "Istruzione pubblicata." },
  { title: "Apri il portale", detail: "Verifica presso l’ente." },
];

test("seleziona esclusivamente istruzioni già pubblicate", () => {
  assert.deepEqual(applyInstructionSelection(instructions, "[1,0]"), [instructions[1], instructions[0]]);
  for (const invalid of ['["https://example.invalid"]', "[0,0]", "[2]", "[-1]", "[]", "testo", '{"url":"https://example.invalid"}']) {
    assert.equal(applyInstructionSelection(instructions, invalid), null);
  }
  assert.equal(isAssistantTopic("documenti"), true);
  assert.equal(isAssistantTopic("constructor"), false);
  assert.equal(isAssistantTopic({ domanda: "Dati personali" }), false);
});
