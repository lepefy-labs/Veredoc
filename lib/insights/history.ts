export type LongitudinalTone = "positive" | "warning" | "neutral";

export interface HistoryDocument {
  id: string;
  profileId?: string;
  type: string;
  status: string;
  analysis: unknown;
  createdAt: Date | string;
}

export interface LongitudinalMetric {
  label: string;
  value: string;
}

export interface LongitudinalInsight {
  id: string;
  kind: "bill" | "payroll";
  title: string;
  headline: string;
  summary: string;
  tone: LongitudinalTone;
  currentDocumentId: string;
  previousDocumentId: string;
  metrics: LongitudinalMetric[];
}

const BILL_LABELS: Record<string, string> = {
  BOLLETTA_LUCE: "Bolletta luce",
  BOLLETTA_GAS: "Bolletta gas",
  BOLLETTA_INTERNET: "Bolletta internet",
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function finiteNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function nestedNumber(root: Record<string, unknown>, section: string, field: string): number | null {
  const nested = asRecord(root[section]);
  return nested ? finiteNumber(nested[field]) : null;
}

function percentageChange(current: number | null, previous: number | null): number | null {
  if (current === null || previous === null || previous === 0) return null;
  return Math.round(((current - previous) / Math.abs(previous)) * 1000) / 10;
}

function money(value: number | null): string | null {
  return value === null ? null : value.toLocaleString("it-IT", { style: "currency", currency: "EUR" });
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

function buildBillInsight(current: HistoryDocument, previous: HistoryDocument): LongitudinalInsight | null {
  const currentAnalysis = asRecord(current.analysis);
  const previousAnalysis = asRecord(previous.analysis);
  if (!currentAnalysis || !previousAnalysis) return null;

  const currentAmount = finiteNumber(currentAnalysis.importo_totale);
  const previousAmount = finiteNumber(previousAnalysis.importo_totale);
  const currentPrice = nestedNumber(currentAnalysis, "materia_energia", "quota_variabile_prezzo_kwh");
  const previousPrice = nestedNumber(previousAnalysis, "materia_energia", "quota_variabile_prezzo_kwh");
  const currentConsumption = nestedNumber(currentAnalysis, "consumi", "mensile_stimato") ?? nestedNumber(currentAnalysis, "consumi", "valore");
  const previousConsumption = nestedNumber(previousAnalysis, "consumi", "mensile_stimato") ?? nestedNumber(previousAnalysis, "consumi", "valore");

  const amountDelta = percentageChange(currentAmount, previousAmount);
  const priceDelta = percentageChange(currentPrice, previousPrice);
  const consumptionDelta = percentageChange(currentConsumption, previousConsumption);
  if (amountDelta === null && priceDelta === null && consumptionDelta === null) return null;

  let headline = "Costi sostanzialmente stabili";
  let summary = "Le due analisi più recenti non mostrano variazioni rilevanti nei dati confrontabili.";
  let tone: LongitudinalTone = "neutral";

  if (amountDelta !== null && Math.abs(amountDelta) >= 8) {
    const rising = amountDelta > 0;
    headline = `Spesa ${rising ? "aumentata" : "diminuita"} del ${Math.abs(amountDelta)}%`;
    tone = rising ? "warning" : "positive";
    if (rising && consumptionDelta !== null && consumptionDelta > 8) {
      summary = `L'aumento della spesa coincide con consumi più alti (${percent(consumptionDelta)}). Veredoc separa così un aumento d'uso da un possibile peggioramento tariffario.`;
    } else if (rising && priceDelta !== null && priceDelta > 5 && (consumptionDelta === null || Math.abs(consumptionDelta) <= 8)) {
      summary = `I consumi risultano simili, mentre il prezzo unitario è salito (${percent(priceDelta)}). È un segnale utile per rivalutare la tariffa.`;
    } else if (!rising && consumptionDelta !== null && consumptionDelta < -8) {
      summary = `La spesa è scesa insieme ai consumi (${percent(consumptionDelta)}): il risparmio sembra dipendere soprattutto da un minore utilizzo.`;
    } else if (!rising && priceDelta !== null && priceDelta < -5) {
      summary = `La spesa è scesa e anche il prezzo unitario è migliorato (${percent(priceDelta)}).`;
    } else {
      summary = "La variazione è reale, ma dai campi disponibili non emerge una singola causa dominante. Apri le due analisi per confrontare il dettaglio.";
    }
  } else if (priceDelta !== null && Math.abs(priceDelta) >= 5) {
    const rising = priceDelta > 0;
    headline = `Prezzo unitario ${rising ? "in aumento" : "in calo"} del ${Math.abs(priceDelta)}%`;
    tone = rising ? "warning" : "positive";
    summary = rising ? "Il prezzo della componente variabile è peggiorato rispetto all'analisi precedente, anche se il totale della bolletta non è ancora cambiato molto." : "La componente variabile è migliorata rispetto all'analisi precedente.";
  }

  const metrics: LongitudinalMetric[] = [];
  const currentAmountLabel = money(currentAmount);
  if (currentAmountLabel) metrics.push({ label: "Ultima spesa", value: currentAmountLabel });
  if (amountDelta !== null) metrics.push({ label: "Variazione spesa", value: percent(amountDelta)! });
  if (priceDelta !== null) metrics.push({ label: "Variazione prezzo", value: percent(priceDelta)! });
  if (consumptionDelta !== null) metrics.push({ label: "Variazione consumi", value: percent(consumptionDelta)! });

  return { id: `${current.profileId ?? "default"}:${current.type}:${current.id}:${previous.id}`, kind: "bill", title: BILL_LABELS[current.type] ?? "Bolletta", headline, summary, tone, currentDocumentId: current.id, previousDocumentId: previous.id, metrics: metrics.slice(0, 3) };
}

function buildPayrollInsight(current: HistoryDocument, previous: HistoryDocument): LongitudinalInsight | null {
  const currentAnalysis = asRecord(current.analysis);
  const previousAnalysis = asRecord(previous.analysis);
  if (!currentAnalysis || !previousAnalysis) return null;
  const currentNet = finiteNumber(currentAnalysis.stipendio_netto);
  const previousNet = finiteNumber(previousAnalysis.stipendio_netto);
  if (currentNet === null || previousNet === null) return null;

  const currentGross = finiteNumber(currentAnalysis.stipendio_lordo);
  const previousGross = finiteNumber(previousAnalysis.stipendio_lordo);
  const currentDeductions = (finiteNumber(currentAnalysis.contributi_inps) ?? 0) + (finiteNumber(currentAnalysis.irpef) ?? 0);
  const previousDeductions = (finiteNumber(previousAnalysis.contributi_inps) ?? 0) + (finiteNumber(previousAnalysis.irpef) ?? 0);
  const netDelta = percentageChange(currentNet, previousNet);
  const grossDelta = percentageChange(currentGross, previousGross);
  const deductionsDelta = percentageChange(currentDeductions, previousDeductions);

  let headline = "Netto sostanzialmente stabile";
  let summary = "Il netto delle due buste paga più recenti è simile. Veredoc continuerà a confrontare i prossimi cedolini automaticamente.";
  let tone: LongitudinalTone = "neutral";

  if (netDelta !== null && Math.abs(netDelta) >= 3) {
    const rising = netDelta > 0;
    headline = `Netto ${rising ? "aumentato" : "diminuito"} del ${Math.abs(netDelta)}%`;
    tone = rising ? "positive" : "warning";
    if (grossDelta !== null && Math.abs(grossDelta) >= 3 && Math.sign(grossDelta) === Math.sign(netDelta)) {
      summary = `Anche il lordo è cambiato nella stessa direzione (${percent(grossDelta)}). La variazione del netto sembra quindi legata soprattutto alla retribuzione del mese.`;
    } else if (!rising && deductionsDelta !== null && deductionsDelta > 5 && (grossDelta === null || Math.abs(grossDelta) < 3)) {
      summary = `Il lordo è simile, ma contributi + IRPEF estratti sono aumentati (${percent(deductionsDelta)}). È una variazione da leggere insieme a conguagli, detrazioni e altre voci del cedolino.`;
    } else if (rising && deductionsDelta !== null && deductionsDelta < -5 && (grossDelta === null || Math.abs(grossDelta) < 3)) {
      summary = `Il lordo è simile, mentre contributi + IRPEF estratti sono diminuiti (${percent(deductionsDelta)}). Verifica il dettaglio per capire se dipende da detrazioni o conguagli.`;
    } else {
      summary = "La variazione del netto è significativa, ma un singolo confronto non basta a identificarne con certezza la causa. Il dettaglio dei due cedolini resta la fonte da verificare.";
    }
  }

  const metrics: LongitudinalMetric[] = [{ label: "Ultimo netto", value: money(currentNet)! }];
  if (netDelta !== null) metrics.push({ label: "Variazione netto", value: percent(netDelta)! });
  if (grossDelta !== null) metrics.push({ label: "Variazione lordo", value: percent(grossDelta)! });
  if (deductionsDelta !== null) metrics.push({ label: "Contributi + IRPEF", value: percent(deductionsDelta)! });

  return { id: `${current.profileId ?? "default"}:BUSTA_PAGA:${current.id}:${previous.id}`, kind: "payroll", title: "Busta paga", headline, summary, tone, currentDocumentId: current.id, previousDocumentId: previous.id, metrics: metrics.slice(0, 3) };
}

export function buildLongitudinalInsights(documents: HistoryDocument[]): LongitudinalInsight[] {
  const completed = documents.filter((document) => document.status === "DONE" && asRecord(document.analysis)).sort((a, b) => dateValue(b.createdAt) - dateValue(a.createdAt));
  const insights: LongitudinalInsight[] = [];
  const profileKeys = [...new Set(completed.map((document) => document.profileId ?? "__default__"))];

  for (const profileKey of profileKeys) {
    const sameProfile = completed.filter((document) => (document.profileId ?? "__default__") === profileKey);
    for (const type of Object.keys(BILL_LABELS)) {
      const sameType = sameProfile.filter((document) => document.type === type);
      if (sameType.length >= 2) {
        const insight = buildBillInsight(sameType[0], sameType[1]);
        if (insight) insights.push(insight);
      }
    }
    const payroll = sameProfile.filter((document) => document.type === "BUSTA_PAGA");
    if (payroll.length >= 2) {
      const insight = buildPayrollInsight(payroll[0], payroll[1]);
      if (insight) insights.push(insight);
    }
  }

  const priority: Record<LongitudinalTone, number> = { warning: 0, positive: 1, neutral: 2 };
  return insights.sort((a, b) => priority[a.tone] - priority[b.tone]);
}
