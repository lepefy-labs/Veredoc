export type TrendTone = "positive" | "warning" | "neutral";

export interface TrendDocument {
  id: string;
  profileId?: string | null;
  type: string;
  status: string;
  analysis: unknown;
  createdAt: Date | string;
}

export interface TrendMetric {
  label: string;
  value: string;
}

export interface TrendInsight {
  id: string;
  title: string;
  headline: string;
  summary: string;
  tone: TrendTone;
  sampleCount: number;
  currentDocumentId: string;
  referenceDocumentId: string;
  metrics: TrendMetric[];
}

const BILL_LABELS: Record<string, string> = {
  BOLLETTA_LUCE: "Bolletta luce",
  BOLLETTA_GAS: "Bolletta gas",
  BOLLETTA_INTERNET: "Bolletta internet",
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function finiteNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function nestedNumber(root: Record<string, unknown>, section: string, field: string): number | null {
  const nested = asRecord(root[section]);
  return nested ? finiteNumber(nested[field]) : null;
}

function percentageChange(current: number | null, reference: number | null): number | null {
  if (current === null || reference === null || reference === 0) return null;
  return Math.round(((current - reference) / Math.abs(reference)) * 1000) / 10;
}

function percent(value: number | null): string | null {
  if (value === null) return null;
  return `${value > 0 ? "+" : ""}${value}%`;
}

function dateValue(value: Date | string): number {
  const date = value instanceof Date ? value : new Date(value);
  const timestamp = date.getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function profileScoped(documents: TrendDocument[], profileId?: string | null): TrendDocument[] {
  if (!profileId) return documents.filter((document) => !document.profileId);
  return documents.filter((document) => document.profileId === profileId);
}

function buildBillTrend(documents: TrendDocument[], type: string): TrendInsight | null {
  const sample = documents
    .filter((document) => document.type === type)
    .slice(0, 4);
  if (sample.length < 3) return null;

  const current = sample[0];
  const reference = sample[sample.length - 1];
  const currentAnalysis = asRecord(current.analysis);
  const referenceAnalysis = asRecord(reference.analysis);
  if (!currentAnalysis || !referenceAnalysis) return null;

  const amountDelta = percentageChange(
    finiteNumber(currentAnalysis.importo_totale),
    finiteNumber(referenceAnalysis.importo_totale)
  );
  const priceDelta = percentageChange(
    nestedNumber(currentAnalysis, "materia_energia", "quota_variabile_prezzo_kwh"),
    nestedNumber(referenceAnalysis, "materia_energia", "quota_variabile_prezzo_kwh")
  );
  const consumptionDelta = percentageChange(
    nestedNumber(currentAnalysis, "consumi", "mensile_stimato") ?? nestedNumber(currentAnalysis, "consumi", "valore"),
    nestedNumber(referenceAnalysis, "consumi", "mensile_stimato") ?? nestedNumber(referenceAnalysis, "consumi", "valore")
  );

  if (amountDelta === null && priceDelta === null && consumptionDelta === null) return null;

  let headline = `Trend stabile su ${sample.length} analisi`;
  let summary = "I valori confrontabili non mostrano uno spostamento rilevante tra il documento più recente e il primo del periodo osservato.";
  let tone: TrendTone = "neutral";

  if (amountDelta !== null && Math.abs(amountDelta) >= 10) {
    const rising = amountDelta > 0;
    headline = `Spesa ${rising ? "in crescita" : "in calo"} nel periodo`;
    tone = rising ? "warning" : "positive";
    if (rising && consumptionDelta !== null && consumptionDelta > 10) {
      summary = `Tra le ultime ${sample.length} analisi la spesa è aumentata del ${Math.abs(amountDelta)}%, insieme ai consumi (${percent(consumptionDelta)}).`;
    } else if (rising && priceDelta !== null && priceDelta > 5) {
      summary = `Tra le ultime ${sample.length} analisi la spesa è aumentata del ${Math.abs(amountDelta)}% e il prezzo unitario è peggiorato (${percent(priceDelta)}).`;
    } else if (!rising) {
      summary = `Tra le ultime ${sample.length} analisi la spesa è diminuita del ${Math.abs(amountDelta)}%. Veredoc continuerà a verificare se il miglioramento si mantiene.`;
    } else {
      summary = `Tra le ultime ${sample.length} analisi la spesa è aumentata del ${Math.abs(amountDelta)}%, senza una singola causa dominante nei campi disponibili.`;
    }
  } else if (priceDelta !== null && Math.abs(priceDelta) >= 7) {
    const rising = priceDelta > 0;
    headline = `Prezzo unitario ${rising ? "in crescita" : "in miglioramento"}`;
    tone = rising ? "warning" : "positive";
    summary = `Il prezzo unitario è cambiato del ${percent(priceDelta)} tra il primo e l'ultimo documento delle ${sample.length} analisi osservate.`;
  }

  const metrics: TrendMetric[] = [];
  if (amountDelta !== null) metrics.push({ label: "Spesa nel periodo", value: percent(amountDelta)! });
  if (priceDelta !== null) metrics.push({ label: "Prezzo unitario", value: percent(priceDelta)! });
  if (consumptionDelta !== null) metrics.push({ label: "Consumi", value: percent(consumptionDelta)! });

  return {
    id: `trend:${type}:${current.id}:${reference.id}`,
    title: BILL_LABELS[type] ?? "Bolletta",
    headline,
    summary,
    tone,
    sampleCount: sample.length,
    currentDocumentId: current.id,
    referenceDocumentId: reference.id,
    metrics: metrics.slice(0, 3),
  };
}

function buildPayrollTrend(documents: TrendDocument[]): TrendInsight | null {
  const sample = documents.filter((document) => document.type === "BUSTA_PAGA").slice(0, 4);
  if (sample.length < 3) return null;

  const current = sample[0];
  const reference = sample[sample.length - 1];
  const currentAnalysis = asRecord(current.analysis);
  const referenceAnalysis = asRecord(reference.analysis);
  if (!currentAnalysis || !referenceAnalysis) return null;

  const netDelta = percentageChange(
    finiteNumber(currentAnalysis.stipendio_netto),
    finiteNumber(referenceAnalysis.stipendio_netto)
  );
  const grossDelta = percentageChange(
    finiteNumber(currentAnalysis.stipendio_lordo),
    finiteNumber(referenceAnalysis.stipendio_lordo)
  );
  if (netDelta === null && grossDelta === null) return null;

  let headline = `Retribuzione stabile su ${sample.length} cedolini`;
  let summary = "Il netto e il lordo non mostrano variazioni rilevanti tra il primo e l'ultimo cedolino del periodo osservato.";
  let tone: TrendTone = "neutral";

  if (netDelta !== null && Math.abs(netDelta) >= 5) {
    const rising = netDelta > 0;
    headline = `Netto ${rising ? "in crescita" : "in calo"} nel periodo`;
    tone = rising ? "positive" : "warning";
    summary = grossDelta !== null && Math.sign(grossDelta) === Math.sign(netDelta) && Math.abs(grossDelta) >= 3
      ? `Tra gli ultimi ${sample.length} cedolini il netto è cambiato del ${percent(netDelta)} e il lordo del ${percent(grossDelta)} nella stessa direzione.`
      : `Tra gli ultimi ${sample.length} cedolini il netto è cambiato del ${percent(netDelta)}. Conguagli, detrazioni e altre voci possono influire: il trend segnala la variazione, non ne certifica la causa.`;
  }

  const metrics: TrendMetric[] = [];
  if (netDelta !== null) metrics.push({ label: "Netto nel periodo", value: percent(netDelta)! });
  if (grossDelta !== null) metrics.push({ label: "Lordo nel periodo", value: percent(grossDelta)! });

  return {
    id: `trend:BUSTA_PAGA:${current.id}:${reference.id}`,
    title: "Busta paga",
    headline,
    summary,
    tone,
    sampleCount: sample.length,
    currentDocumentId: current.id,
    referenceDocumentId: reference.id,
    metrics,
  };
}

export function buildMultiPeriodTrends(documents: TrendDocument[], profileId?: string | null): TrendInsight[] {
  const completed = profileScoped(documents, profileId)
    .filter((document) => document.status === "DONE" && asRecord(document.analysis))
    .sort((a, b) => dateValue(b.createdAt) - dateValue(a.createdAt));

  const trends: TrendInsight[] = [];
  for (const type of Object.keys(BILL_LABELS)) {
    const trend = buildBillTrend(completed, type);
    if (trend) trends.push(trend);
  }
  const payroll = buildPayrollTrend(completed);
  if (payroll) trends.push(payroll);

  const priority: Record<TrendTone, number> = { warning: 0, positive: 1, neutral: 2 };
  return trends.sort((a, b) => priority[a.tone] - priority[b.tone]);
}
