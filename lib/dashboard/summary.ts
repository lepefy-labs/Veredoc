// Riepilogo dei documenti per la dashboard: al browser arrivano solo i campi mostrati
// nella lista (niente analisi completa, dati estratti o testo anonimizzato).

export interface DashboardDocumentSummary {
  id: string;
  profileId: string;
  type: string;
  fileName: string;
  status: string;
  createdAt: string;
  amount: number | null;
  counterparty: string | null;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function finiteNumber(value: unknown): number | null {
  const number = typeof value === "number" ? value : typeof value === "string" && value.trim() ? Number(value) : NaN;
  return Number.isFinite(number) ? number : null;
}

function shortText(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, 120) : null;
}

export function summarizeDocument(document: {
  id: string;
  profileId: string;
  type: string;
  fileName: string;
  status: string;
  createdAt: Date;
  analysis: unknown;
}): DashboardDocumentSummary {
  const analysis = document.status === "DONE" ? asRecord(document.analysis) : null;
  return {
    id: document.id,
    profileId: document.profileId,
    type: document.type,
    fileName: document.fileName,
    status: document.status,
    createdAt: document.createdAt.toISOString(),
    amount: analysis ? finiteNumber(analysis.importo_totale ?? analysis.stipendio_netto) : null,
    counterparty: analysis ? shortText(analysis.fornitore ?? analysis.datore_lavoro) : null,
  };
}
