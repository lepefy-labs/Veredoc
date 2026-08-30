export interface VoceBustaPaga {
  nome: string;
  importo: number;
  tipo: "competenza" | "trattenuta";
  spiegazione: string;
}

export type PayrollBalanceType = "ferie" | "permessi" | "rol" | "ex_festivita" | "altro";

export interface PayrollBalance {
  tipo: PayrollBalanceType;
  maturato: number | null;
  goduto: number | null;
  residuo: number | null;
  unita: string | null;
}

export type PayrollPeriodEventType =
  | "straordinario"
  | "premio"
  | "assenza"
  | "malattia"
  | "ferie"
  | "permesso"
  | "altro";

export interface PayrollPeriodEvent {
  tipo: PayrollPeriodEventType;
  descrizione: string;
  quantita: number | null;
  unita: string | null;
  importo: number | null;
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
    saldi_temporali_estratti: number;
    eventi_periodo_estratti: number;
  };
  engineVersion: "payroll-coherence-v2";
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
  tfr_progressivo?: number | null;
  saldi_assenze?: PayrollBalance[];
  eventi_periodo?: PayrollPeriodEvent[];
  competenze_totali?: number | null;
  trattenute_totali?: number | null;
  imponibile_previdenziale?: number | null;
  imponibile_fiscale?: number | null;
  irpef_lorda?: number | null;
  detrazioni?: number | null;
  addizionali?: number | null;
  verifica?: PayrollVerification;
}
