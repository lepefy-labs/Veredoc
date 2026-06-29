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

// Provider noti accettati dal parser ARERA — filtra rumore/dati malformati
export const PROVIDER_WHITELIST = [
  'enel', 'eni', 'plenitude', 'edison', 'a2a', 'iren',
  'hera', 'acea', 'engie', 'sorgenia', 'iberdrola', 'eon',
  'octopus', 'nen', 'dolomiti', 'axpo', 'illumia', 'alperia',
  'green network',
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

// Label leggibili per tipo documento
export const DOCUMENTO_LABEL: Record<string, string> = {
  BOLLETTA_LUCE: "Bolletta Luce",
  BOLLETTA_GAS: "Bolletta Gas",
  BOLLETTA_INTERNET: "Bolletta Internet",
  BUSTA_PAGA: "Busta Paga",
};
