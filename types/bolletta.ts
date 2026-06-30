export interface VoceDettaglio {
  nome: string;
  importo: number;
  categoria?: "materia_energia" | "rete_oneri" | "imposte" | "altro";
  spiegazione: string;
}

export interface MateriaEnergia {
  quota_variabile_eur: number | null;
  quota_variabile_prezzo_kwh: number | null;
  quota_fissa_eur: number | null;
  quota_fissa_mensile_eur: number | null;
  totale_eur: number | null;
}

export interface BollettaRaw {
  tipo: "luce" | "gas" | "internet" | "telefonia";
  fornitore: string;
  offerta_nome?: string;
  periodo: string;
  periodo_giorni: number | null;
  scadenza?: string | null;
  potenza_impegnata_kw?: number | null;
  consumi: {
    valore: number;
    unita: string;
    mensile_stimato: number | null;
  } | null;
  materia_energia: MateriaEnergia;
  rete_e_oneri: {
    trasporto_rete_eur: number | null;
    oneri_sistema_eur: number | null;
    quota_potenza_eur: number | null;
    totale_eur: number | null;
  };
  imposte: {
    accise_eur: number | null;
    iva_eur: number | null;
    totale_eur: number | null;
  };
  altro: {
    canone_rai_eur: number | null;
    altri_eur: number | null;
  };
  importo_totale: number;
  voci_dettaglio: VoceDettaglio[];
}

// BollettaData kept for backwards compatibility with existing stored documents
export interface BollettaData extends BollettaRaw {}

export interface OffertaMercato {
  provider: string;
  plan_name: string;
  prezzo_kwh: number;
  quota_fissa_mensile: number | null;
  costo_mensile_stimato: number | null;
  risparmio_mensile: number | null;
  risparmio_annuo: number | null;
  break_even_kwh: number | null;
  stima_completa: boolean;
  url: string | null;
  tipo_offerta: string | null;
  durata_mesi: number | null;
  offerta_fine: string | null;
}

export interface OffertaConsigliata {
  provider: string;
  piano: string;
  prezzo: number;
  url: string;
  risparmio_stimato: number;
}

export interface ConfrontoMercato {
  costo_materia_mensile_attuale: number | null;
  prezzo_kwh_attuale: number | null;
  quota_fissa_mensile_attuale: number;
  kwh_mese_stimati: number | null;
  media_mercato_mensile: number | null;
  minimo_mercato_mensile: number | null;
  percentuale_sopra_media: number | null;
  miglior_risparmio_mensile: number | null;
  miglior_risparmio_annuo: number | null;
  arera_prezzo_kwh: number | null;
  offerte: OffertaMercato[];
  stima_affidabile: boolean;
}

export interface BollettaAnalysis extends BollettaRaw {
  confronto_mercato: ConfrontoMercato | null;
}
