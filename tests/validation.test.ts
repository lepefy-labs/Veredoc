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

test("validateBustaPagaOutput validates payroll payloads", () => {
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
  assert.equal(result.stipendio_netto, 1650);
});
