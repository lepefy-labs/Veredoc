import assert from "node:assert/strict";
import test from "node:test";
import { verificaBustaPaga } from "../lib/parsers/bustapaga.ts";
import type { BustaPagaData } from "../types/bustapaga.ts";

function base(overrides: Partial<BustaPagaData> = {}): BustaPagaData {
  return {
    datore_lavoro: "Azienda Test",
    competenza: "Agosto 2026",
    stipendio_lordo: 2500,
    stipendio_netto: 1800,
    voci: [],
    contributi_inps: 230,
    irpef: 370,
    tfr_maturato: 185,
    competenze_totali: 2500,
    trattenute_totali: 700,
    imponibile_previdenziale: 2500,
    imponibile_fiscale: 2200,
    ...overrides,
  };
}

test("cedolino che quadra produce un verdetto coerente", () => {
  const result = verificaBustaPaga(base());
  assert.equal(result.verdict, "coerente");
  assert.equal(result.metrics.scostamento_quadratura, 0);
  assert.ok(result.checks.some((check) => check.id === "quadratura-netto" && check.level === "ok"));
});

test("scostamento significativo tra totali e netto viene segnalato", () => {
  const result = verificaBustaPaga(base({ stipendio_netto: 1600 }));
  assert.equal(result.verdict, "da_verificare");
  assert.ok(result.checks.some((check) => check.id === "quadratura-netto" && check.level === "warning"));
});

test("aliquota contributiva anomala viene segnalata senza dichiarare errore legale", () => {
  const result = verificaBustaPaga(base({ contributi_inps: 500, imponibile_previdenziale: 2000 }));
  assert.equal(result.verdict, "da_verificare");
  const check = result.checks.find((item) => item.id === "contributi");
  assert.equal(check?.level, "warning");
  assert.match(check?.summary ?? "", /può|possono/i);
});

test("dati mancanti non producono un falso allarme", () => {
  const result = verificaBustaPaga(base({
    competenze_totali: null,
    trattenute_totali: null,
    imponibile_previdenziale: null,
    imponibile_fiscale: null,
  }));
  assert.notEqual(result.verdict, "da_verificare");
});
