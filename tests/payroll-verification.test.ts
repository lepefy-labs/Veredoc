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
    tfr_progressivo: 3200,
    saldi_assenze: [
      { tipo: "ferie", maturato: 14.5, goduto: 8, residuo: 42.5, unita: "ore" },
      { tipo: "rol", maturato: 6, goduto: 2, residuo: 18, unita: "ore" },
    ],
    eventi_periodo: [
      { tipo: "straordinario", descrizione: "Straordinario 25%", quantita: 6, unita: "ore", importo: 95 },
    ],
    competenze_totali: 2500,
    trattenute_totali: 700,
    imponibile_previdenziale: 2500,
    imponibile_fiscale: 2200,
    ...overrides,
  };
}

test("cedolino che quadra produce un verdetto coerente con motore v2", () => {
  const result = verificaBustaPaga(base());
  assert.equal(result.verdict, "coerente");
  assert.equal(result.engineVersion, "payroll-coherence-v2");
  assert.equal(result.metrics.scostamento_quadratura, 0);
  assert.equal(result.metrics.saldi_temporali_estratti, 2);
  assert.equal(result.metrics.eventi_periodo_estratti, 1);
  assert.ok(result.checks.some((check) => check.id === "quadratura-netto" && check.level === "ok"));
  assert.ok(result.checks.some((check) => check.id === "eventi-periodo" && check.level === "info"));
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

test("saldo ferie negativo diventa un segnale da verificare, non una dichiarazione di errore", () => {
  const result = verificaBustaPaga(base({
    saldi_assenze: [{ tipo: "ferie", maturato: 8, goduto: 16, residuo: -4, unita: "ore" }],
  }));
  assert.equal(result.verdict, "da_verificare");
  const check = result.checks.find((item) => item.id === "saldi-assenze-negativi");
  assert.equal(check?.level, "warning");
  assert.match(check?.summary ?? "", /Può dipendere/i);
});

test("TFR progressivo negativo viene segnalato come dato da verificare", () => {
  const result = verificaBustaPaga(base({ tfr_progressivo: -120 }));
  assert.equal(result.verdict, "da_verificare");
  assert.ok(result.checks.some((check) => check.id === "tfr-progressivo" && check.level === "warning"));
});

test("dati mancanti non producono un falso allarme", () => {
  const result = verificaBustaPaga(base({
    competenze_totali: null,
    trattenute_totali: null,
    imponibile_previdenziale: null,
    imponibile_fiscale: null,
    tfr_progressivo: null,
    saldi_assenze: [],
    eventi_periodo: [],
  }));
  assert.notEqual(result.verdict, "da_verificare");
});
