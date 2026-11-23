import assert from "node:assert/strict";
import test from "node:test";
import { practicalGuide } from "../lib/pratiche/guide-content.ts";
import { applyInstructionSelection, isAssistantTopic, relevantInstructions, type AssistantTopic } from "../lib/pratiche/guide-assistant.ts";

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

const evaluation: { version: string; topic: AssistantTopic; count: number; mock?: number[] }[] = [
  { version: "pv_isee_1", topic: "passaggi", count: 4, mock: [0, 1, 2] },
  { version: "pv_bonus_nido_1", topic: "documenti", count: 5, mock: [2, 3, 1] },
  { version: "pv_bonus_nido_1", topic: "passaggi", count: 4, mock: [0, 1, 2] },
  { version: "pv_isee_1", topic: "documenti", count: 3 },
  { version: "pv_isee_1", topic: "presentazione", count: 1 },
  { version: "pv_isee_corrente_1", topic: "passaggi", count: 3 },
  { version: "pv_assegno_unico_1", topic: "documenti", count: 3 },
];

for (const { version, topic, count, mock } of evaluation) {
  test(`campione di riordino ${version} / ${topic}`, () => {
    const guide = practicalGuide(version);
    assert.ok(guide);
    const candidates = relevantInstructions(guide, topic);
    assert.equal(candidates.length, count);
    assert.equal(candidates.length > 3, mock !== undefined);
    if (mock) {
      assert.deepEqual(applyInstructionSelection(candidates, JSON.stringify(mock)), mock.map((index) => candidates[index]));
      assert.equal(applyInstructionSelection(candidates, "[999]"), null);
    }
  });
}

test("nel campione bonus nido il riordino può conservare entrambe le prove", () => {
  const guide = practicalGuide("pv_bonus_nido_1");
  assert.ok(guide);
  const candidates = relevantInstructions(guide, "documenti");
  const proof = "Prova del pagamento tracciabile";
  assert.ok(!candidates.slice(0, 3).some(({ title }) => title === proof));
  assert.deepEqual(applyInstructionSelection(candidates, "[2,3,1]")?.slice(0, 2).map(({ title }) => title), [
    "Documenti di spesa per ogni mese",
    proof,
  ]);
});
