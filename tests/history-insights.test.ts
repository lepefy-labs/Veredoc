import assert from "node:assert/strict";
import test from "node:test";
import { buildLongitudinalInsights } from "../lib/insights/history.ts";

function bill(id: string, createdAt: string, amount: number, price: number, consumption: number, type = "BOLLETTA_LUCE") {
  return {
    id,
    type,
    status: "DONE",
    createdAt,
    analysis: {
      importo_totale: amount,
      materia_energia: { quota_variabile_prezzo_kwh: price },
      consumi: { mensile_stimato: consumption },
    },
  };
}

function payroll(id: string, createdAt: string, net: number, gross: number, contributions: number, irpef: number) {
  return {
    id,
    type: "BUSTA_PAGA",
    status: "DONE",
    createdAt,
    analysis: {
      stipendio_netto: net,
      stipendio_lordo: gross,
      contributi_inps: contributions,
      irpef,
    },
  };
}

test("confronta due bollette dello stesso tipo e distingue aumento consumi da tariffa", () => {
  const insights = buildLongitudinalInsights([
    bill("new", "2026-08-30T10:00:00Z", 132, 0.21, 310),
    bill("old", "2026-07-30T10:00:00Z", 100, 0.20, 240),
  ]);

  assert.equal(insights.length, 1);
  assert.equal(insights[0].kind, "bill");
  assert.equal(insights[0].tone, "warning");
  assert.match(insights[0].headline, /aumentata/);
  assert.match(insights[0].summary, /consumi più alti/);
  assert.equal(insights[0].currentDocumentId, "new");
});

test("evidenzia un calo del netto con lordo stabile e trattenute in aumento", () => {
  const insights = buildLongitudinalInsights([
    payroll("aug", "2026-08-30T10:00:00Z", 1570, 2300, 260, 340),
    payroll("jul", "2026-07-30T10:00:00Z", 1700, 2300, 230, 280),
  ]);

  assert.equal(insights.length, 1);
  assert.equal(insights[0].kind, "payroll");
  assert.equal(insights[0].tone, "warning");
  assert.match(insights[0].headline, /Netto diminuito/);
  assert.match(insights[0].summary, /contributi \+ IRPEF estratti sono aumentati/);
});

test("non confronta categorie di bolletta diverse", () => {
  const insights = buildLongitudinalInsights([
    bill("luce", "2026-08-30T10:00:00Z", 120, 0.22, 280, "BOLLETTA_LUCE"),
    bill("gas", "2026-07-30T10:00:00Z", 100, 0.18, 250, "BOLLETTA_GAS"),
  ]);

  assert.deepEqual(insights, []);
});

test("ignora documenti non completati", () => {
  const pending = bill("pending", "2026-08-30T10:00:00Z", 150, 0.25, 300);
  pending.status = "PENDING";

  const insights = buildLongitudinalInsights([
    pending,
    bill("done", "2026-07-30T10:00:00Z", 100, 0.20, 250),
  ]);

  assert.deepEqual(insights, []);
});
