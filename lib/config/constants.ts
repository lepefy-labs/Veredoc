// Limiti mensili analisi per piano utente
export const ANALYSIS_LIMITS = {
  FREE: 10,
  PRO: 30,
};

// Soglia percentuale sopra la quale si considera che l'utente stia pagando troppo
export const SOGLIA_PAGAMENTO_ECCESSIVO_PERCENTUALE = 5;

// Numero di offerte consigliate da mostrare nel confronto mercato
export const NUM_OFFERTE_CONSIGLIATE = 3;

// Risparmio annuo minimo per mostrare il banner risparmio (in euro)
export const RISPARMIO_MINIMO_BANNER_EURO = 50;

// Dimensione massima file upload in byte (10MB)
export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

// Tipi di file accettati per l'upload
export const ACCEPTED_FILE_TYPES = ["application/pdf", "image/jpeg", "image/png"];

// Categorie mercato per scraping
export const CATEGORIE_MERCATO = ["luce", "gas", "internet", "telefonia"] as const;
export type CategoriaM = typeof CATEGORIE_MERCATO[number];

// ARERA Open Data — Portale Offerte Mercato Libero (XML)
export const ARERA_ML_BASE =
  'https://www.ilportaleofferte.it/portaleOfferte/resources/opendata/csv/offerteML';

// Indici mercato all'ingrosso — aggiornare manualmente ogni mese
// Fonte: ARERA / bollette utenti / Facile.it
// Luglio 2025 (ultimo dato disponibile da fonte ARERA):
//   PUN = 0.113 €/kWh, PSV = 0.394 €/Smc
// Valori approssimativi giugno 2026 da fonti di mercato:
//   PUN ≈ 0.112 €/kWh, PSV ≈ 0.422 €/Smc
export const INDICI_MERCATO = {
  PUN: 0.112,        // €/kWh — Prezzo Unico Nazionale luce
  PSV: 0.422,        // €/Smc — Punto di Scambio Virtuale gas
  aggiornatoIl: '2026-06',
};

export const PROVIDER_WHITELIST_EXACT = [
  'eni', 'eon', 'nen', 'a2a',
];

export const PROVIDER_WHITELIST_CONTAINS = [
  'enel', 'plenitude', 'edison', 'iren', 'hera', 'acea',
  'engie', 'sorgenia', 'iberdrola', 'octopus', 'dolomiti',
  'axpo', 'illumia', 'alperia', 'green network',
];

// Mapping tipo documento -> categoria mercato
export const TIPO_DOCUMENTO_CATEGORIA: Record<string, CategoriaM> = {
  BOLLETTA_LUCE: "luce",
  BOLLETTA_GAS: "gas",
  BOLLETTA_INTERNET: "internet",
};

// Label leggibili per tipo documento (usate nel banner correzione tipo)
export const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  BOLLETTA_LUCE:     'Bolletta Luce',
  BOLLETTA_GAS:      'Bolletta Gas',
  BOLLETTA_INTERNET: 'Bolletta Internet/Telefonia',
  BUSTA_PAGA:        'Busta Paga',
};

export const PROVIDER_DISPLAY_NAMES: Record<string, { nome: string; iniziali: string; colore: string }> = {
  'enel':            { nome: 'Enel Energia',     iniziali: 'EN', colore: '#00a651' },
  'enelenergia':     { nome: 'Enel Energia',     iniziali: 'EN', colore: '#00a651' },
  'eni':             { nome: 'Eni Plenitude',    iniziali: 'EP', colore: '#2980b9' },
  'plenitude':       { nome: 'Eni Plenitude',    iniziali: 'EP', colore: '#2980b9' },
  'eniplenitude':    { nome: 'Eni Plenitude',    iniziali: 'EP', colore: '#2980b9' },
  'edison':          { nome: 'Edison Energia',   iniziali: 'ED', colore: '#e74c3c' },
  'a2a':             { nome: 'A2A Energia',      iniziali: 'A2', colore: '#e67e22' },
  'a2aenergia':      { nome: 'A2A Energia',      iniziali: 'A2', colore: '#e67e22' },
  'iren':            { nome: 'Iren Luce Gas',    iniziali: 'IR', colore: '#c0392b' },
  'irenlucegas':     { nome: 'Iren Luce Gas',    iniziali: 'IR', colore: '#c0392b' },
  'seviren':         { nome: 'Iren Luce Gas',    iniziali: 'IR', colore: '#c0392b' },
  'hera':            { nome: 'Hera Comm',        iniziali: 'HC', colore: '#16a085' },
  'acea':            { nome: 'Acea Energia',     iniziali: 'AC', colore: '#2c3e50' },
  'engie':           { nome: 'Engie',            iniziali: 'EG', colore: '#00aaff' },
  'sorgenia':        { nome: 'Sorgenia',         iniziali: 'SO', colore: '#27ae60' },
  'iberdrola':       { nome: 'Iberdrola',        iniziali: 'IB', colore: '#003366' },
  'eon':             { nome: 'E.ON Energia',     iniziali: 'EO', colore: '#e2001a' },
  'octopus':         { nome: 'Octopus Energy',   iniziali: 'OC', colore: '#1a1a2e' },
  'octopusenergy':   { nome: 'Octopus Energy',   iniziali: 'OC', colore: '#1a1a2e' },
  'nen':             { nome: 'NeN',              iniziali: 'NE', colore: '#6c3483' },
  'dolomiti':        { nome: 'Dolomiti Energia', iniziali: 'DO', colore: '#2471a3' },
  'dolomitienergia': { nome: 'Dolomiti Energia', iniziali: 'DO', colore: '#2471a3' },
  'axpo':            { nome: 'Axpo Energia',     iniziali: 'AX', colore: '#1f618d' },
  'illumia':         { nome: 'Illumia',          iniziali: 'IL', colore: '#f39c12' },
  'alperia':         { nome: 'Alperia Energia',  iniziali: 'AL', colore: '#27ae60' },
  'green':           { nome: 'Green Network',    iniziali: 'GN', colore: '#1e8449' },
};

// Label leggibili per tipo documento
export const DOCUMENTO_LABEL: Record<string, string> = {
  BOLLETTA_LUCE: "Bolletta Luce",
  BOLLETTA_GAS: "Bolletta Gas",
  BOLLETTA_INTERNET: "Bolletta Internet",
  BUSTA_PAGA: "Busta Paga",
};
