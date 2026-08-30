import assert from "node:assert/strict";
import test from "node:test";
import { detectMimeType, validateDocumentBuffer } from "../lib/documents/upload-validation.ts";
import { validateBollettaOutput, validateBustaPagaOutput } from "../lib/ai/validate.ts";

test("detectMimeType recognizes supported file signatures", () => {
  assert.equal(detectMimeType(Buffer.from("%PDF-1.7")), "application/pdf");
  assert.equal(detectMimeType(Buffer.from([0xff, 0xd8, 0xff, 0x00])), "image/jpeg");
  assert.equal(detectMimeType(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])), "image/png");
  assert.equal(detectMimeType(Buffer.from("not-a-document")), null);
});

test("validateDocumentBuffer rejects MIME spoofing", () => {
  assert.throws(() => validateDocumentBuffer(Buffer.from("%PDF-1.7"), "image/png"), /non corrisponde/);
});

test("validateBollettaOutput accepts a complete bill payload", () => {
  const result = validateBollettaOutput({
    tipo_rilevato: "luce",
    tipo: "luce",
    fornitore: "Fornitore Test",
    offerta_nome: null,
    periodo: "agosto 2026",
    periodo_giorni: 30,
    scadenza: null,
    potenza_impegnata_kw: 3,
    consumi: { valore: 120, unita: "kWh", mensile_stimato: 120 },
    materia_energia: {
      quota_variabile_eur: 20,
      quota_variabile_prezzo_kwh: 0.16,
      quota_fissa_eur: 8,
      quota_fissa_mensile_eur: 8,
      totale_eur: 28,
    },
    rete_e_oneri: { trasporto_rete_eur: 10, oneri_sistema_eur: 4, quota_potenza_eur: 2, totale_eur: 16 },
    imposte: { accise_eur: 3, iva_eur: 5, totale_eur: 8 },
    altro: { canone_rai_eur: 0, altri_eur: 0 },
    importo_totale: 52,
    voci_dettaglio: [{ nome: "Energia", importo: 20, categoria: "materia_energia", spiegazione: "Costo energia" }],
  });
  assert.equal(result.importo_totale, 52);
});

test("validateBollettaOutput normalizes nullable internet sections", () => {
  const result = validateBollettaOutput({
    tipo_rilevato: "internet",
    tipo: "internet",
    fornitore: "ISP Test",
    offerta_nome: "Fibra",
    periodo: "agosto 2026",
    periodo_giorni: 30,
    scadenza: null,
    potenza_impegnata_kw: null,
    consumi: null,
    materia_energia: {
      quota_variabile_eur: null,
      quota_variabile_prezzo_kwh: null,
      quota_fissa_eur: 25,
      quota_fissa_mensile_eur: 25,
      totale_eur: 25,
    },
    rete_e_oneri: null,
    imposte: null,
    altro: null,
    importo_totale: 25,
    voci_dettaglio: [],
  });
  assert.equal(result.rete_e_oneri.totale_eur, null);
});

test("validateBollettaOutput rejects malformed numeric data", () => {
  assert.throws(() => validateBollettaOutput({ tipo_rilevato: "luce", tipo: "luce" }));
});

test("validateBustaPagaOutput accepts a realistic anonymized payroll shape", () => {
  const result = validateBustaPagaOutput({
    tipo_rilevato: "busta_paga",
    datore_lavoro: "Datore Test",
    competenza: "08/2026",
    stipendio_lordo: 2450,
    stipendio_netto: 1768.42,
    competenze_totali: 2545,
    trattenute_totali: 776.58,
    imponibile_previdenziale: 2450,
    imponibile_fiscale: 2228.75,
    contributi_inps: 224.91,
    irpef: 381.67,
    irpef_lorda: 512.3,
    detrazioni: 130.63,
    addizionali: 39.2,
    tfr_maturato: 181.48,
    tfr_progressivo: 3629.6,
    saldi_assenze: [
      { tipo: "ferie", maturato: 14.4, goduto: 8, residuo: 52.5, unita: "ore" },
      { tipo: "rol", maturato: 5.8, goduto: 0, residuo: 21.8, unita: "ore" },
    ],
    eventi_periodo: [
      { tipo: "straordinario", descrizione: "Straordinario 25%", quantita: 6, unita: "ore", importo: 95 },
      { tipo: "premio", descrizione: "Premio presenza", quantita: null, unita: null, importo: 120 },
    ],
    voci: [
      { nome: "Paga base", importo: 2330, tipo: "competenza", spiegazione: "Retribuzione ordinaria" },
      { nome: "Premio presenza", importo: 120, tipo: "competenza", spiegazione: "Premio indicato nel periodo" },
    ],
  });
  assert.equal(result.stipendio_netto, 1768.42);
  assert.equal(result.saldi_assenze?.length, 2);
  assert.equal(result.eventi_periodo?.[0].tipo, "straordinario");
  assert.equal(result.tfr_progressivo, 3629.6);
});

test("validateBustaPagaOutput keeps v1-compatible payroll payloads valid", () => {
  const result = validateBustaPagaOutput({
    tipo_rilevato: "busta_paga",
    datore_lavoro: "Datore Test",
    competenza: "08/2026",
    stipendio_lordo: 2200,
    stipendio_netto: 1650,
    voci: [{ nome: "Paga base", importo: 2200, tipo: "competenza", spiegazione: "Retribuzione lorda" }],
    contributi_inps: 210,
    irpef: 340,
    tfr_maturato: 150,
  });
  assert.deepEqual(result.saldi_assenze, []);
  assert.deepEqual(result.eventi_periodo, []);
  assert.equal(result.tfr_progressivo, null);
});

test("validateBustaPagaOutput rejects unsupported payroll event categories", () => {
  assert.throws(() => validateBustaPagaOutput({
    tipo_rilevato: "busta_paga",
    datore_lavoro: "Datore Test",
    competenza: "08/2026",
    stipendio_lordo: 2200,
    stipendio_netto: 1650,
    voci: [],
    contributi_inps: 210,
    irpef: 340,
    tfr_maturato: null,
    eventi_periodo: [{ tipo: "inventato", descrizione: "x", quantita: null, unita: null, importo: null }],
  }), /non supportato/);
});
