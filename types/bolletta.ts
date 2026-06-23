export interface VoceDettaglio {
  nome: string;
  importo: number;
  spiegazione: string;
}

export interface BollettaData {
  tipo: "luce" | "gas" | "internet" | "telefonia";
  fornitore: string;
  periodo: string;
  importo_totale: number;
  consumi: { valore: number; unita: string } | null;
  voci_dettaglio: VoceDettaglio[];
  scadenza: string | null;
}

export interface OffertaConsigliata {
  provider: string;
  piano: string;
  prezzo: number;
  url: string;
  risparmio_stimato: number;
}

export interface ConfrontoMercato {
  prezzo_utente: number;
  prezzo_medio_mercato: number;
  prezzo_minimo_mercato: number;
  differenza_percentuale: number;
  sta_pagando_troppo: boolean;
  offerte_consigliate: OffertaConsigliata[];
}

export interface BollettaAnalysis extends BollettaData {
  confronto_mercato: ConfrontoMercato | null;
}
