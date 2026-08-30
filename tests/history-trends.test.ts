import assert from "node:assert/strict";
import test from "node:test";
import { buildMultiPeriodTrends } from "../lib/insights/trends.ts";

function bill(id: string, profileId: string, createdAt: string, amount: number, price: number, consumption: number) {
  return {
    id,
    profileId,
    type: "BOLLETTA_LUCE",
    status: "DONE",
    createdAt,
    analysis: {
      importo_totale: amount,
      materia_energia: { quota_variabile_prezzo_kwh: price },
      consumi: { mensile_stimato: consumption },
    },
  };
}

function payroll(id: string, profileId: string, createdAt: string, net: number, gross: number) {
  return {
    id,
    profileId,
    type: "BUSTA_PAGA",
    status: "DONE",
    createdAt,
    analysis: { stipendio_netto: net, stipendio_lordo: gross },
  };
}

test("crea un trend bolletta usando fino a quattro analisi dello stesso profilo", () => {
  const trends = buildMultiPeriodTrends([
    bill("aug", "me", "2026-08-30T10:00:00Z", 140, 0.24, 300),
    bill("jul", "me", "2026-07-30T10:00:00Z", 125, 0.22, 290),
    bill("jun", "me", "2026-06-30T10:00:00Z", 115, 0.21, 285),
    bill("may", "me", "2026-05-30T10:00:00Z", 100, 0.20, 280),
  ], "me");

  assert.equal(trends.length, 1);
  assert.equal(trends[0].sampleCount, 4);
  assert.equal(trends[0].tone, "warning");
  assert.equal(trends[0].currentDocumentId, "aug");
  assert.equal(trends[0].referenceDocumentId, "may");
  assert.match(trends[0].headline, /Spesa in crescita/);
});

test("non produce trend con meno di tre documenti", () => {
  const trends = buildMultiPeriodTrends([
    bill("aug", "me", "2026-08-30T10:00:00Z", 120, 0.22, 280),
    bill("jul", "me", "2026-07-30T10:00:00Z", 100, 0.20, 250),
  ], "me");
  assert.deepEqual(trends, []);
});

test("isola sempre i profili anche quando il chiamante passa documenti misti", () => {
  const trends = buildMultiPeriodTrends([
    payroll("me-3", "me", "2026-08-30T10:00:00Z", 1600, 2300),
    payroll("me-2", "me", "2026-07-30T10:00:00Z", 1580, 2300),
    payroll("me-1", "me", "2026-06-30T10:00:00Z", 1550, 2250),
    payroll("brother-3", "brother", "2026-08-30T10:00:00Z", 2800, 4000),
    payroll("brother-2", "brother", "2026-07-30T10:00:00Z", 2700, 3900),
    payroll("brother-1", "brother", "2026-06-30T10:00:00Z", 2600, 3800),
  ], "me");

  assert.equal(trends.length, 1);
  assert.equal(trends[0].currentDocumentId, "me-3");
  assert.equal(trends[0].referenceDocumentId, "me-1");
});
