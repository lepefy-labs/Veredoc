export interface VoceBustaPaga {
  nome: string;
  importo: number;
  tipo: "competenza" | "trattenuta";
  spiegazione: string;
}

export type PayrollCheckLevel = "ok" | "warning" | "info";

export interface PayrollCheck {
  id: string;
  level: PayrollCheckLevel;
  title: string;
  summary: string;
}

export interface PayrollVerification {
  verdict: "coerente" | "da_verificare" | "dati_insufficienti";
  title: string;
  summary: string;
  checks: PayrollCheck[];
  metrics: {
    aliquota_contributiva_effettiva: number | null;
    incidenza_irpef: number | null;
    rapporto_netto_lordo: number | null;
    scostamento_quadratura: number | null;
  };
  engineVersion: "payroll-coherence-v1";
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
  competenze_totali?: number | null;
  trattenute_totali?: number | null;
  imponibile_previdenziale?: number | null;
  imponibile_fiscale?: number | null;
  irpef_lorda?: number | null;
  detrazioni?: number | null;
  addizionali?: number | null;
  verifica?: PayrollVerification;
}
