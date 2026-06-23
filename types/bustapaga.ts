export interface VoceBustaPaga {
  nome: string;
  importo: number;
  tipo: "competenza" | "trattenuta";
  spiegazione: string;
}

export interface BustaPagaData {
  datore_lavoro: string;
  competenza: string;
  stipendio_lordo: number;
  stipendio_netto: number;
  voci: VoceBustaPaga[];
  contributi_inps: number;
  irpef: number;
  tfr_maturato: number | null;
}
