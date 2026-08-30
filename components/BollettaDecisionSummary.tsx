import type { BollettaAnalysis } from "@/types/bolletta";
import { RISPARMIO_MINIMO_BANNER_EURO } from "@/lib/config/constants";

interface Props {
  data: BollettaAnalysis;
}

function eur(value: number): string {
  return value.toLocaleString("it-IT", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
}

export default function BollettaDecisionSummary({ data }: Props) {
  const confronto = data.confronto_mercato;
  const pct = confronto?.percentuale_sopra_media ?? null;
  const savingMonth = confronto?.miglior_risparmio_mensile ?? null;
  const savingYear = confronto?.miglior_risparmio_annuo ?? null;
  const actionableSaving = savingMonth != null && savingMonth > 0 && savingYear != null && savingYear >= RISPARMIO_MINIMO_BANNER_EURO;

  let tone = "border-blue-200 bg-blue-50 text-blue-950";
  let label = "Confronto in elaborazione";
  let title = "Abbiamo letto la bolletta";
  let body = "Il dettaglio è disponibile sotto. Il confronto mercato non contiene ancora abbastanza dati per una raccomandazione affidabile.";
  let action: string | null = null;

  if (confronto && confronto.prezzo_kwh_attuale !== null) {
    if (actionableSaving) {
      tone = "border-amber-300 bg-amber-50 text-amber-950";
      label = "Azione consigliata";
      title = `Vale la pena confrontare altre offerte`;
      body = `La migliore alternativa disponibile stima circa ${eur(savingMonth)}/mese di risparmio, pari a ${eur(savingYear)}/anno.`;
      action = "Guarda le alternative più convenienti";
    } else if (pct != null && pct > 5) {
      tone = "border-amber-300 bg-amber-50 text-amber-950";
      label = "Tariffa sopra il mercato";
      title = `Stai pagando circa il ${Math.abs(pct)}% più della media considerata`;
      body = "Non tutta la bolletta è negoziabile, ma la componente energia merita un confronto con le offerte disponibili.";
      action = "Controlla il confronto mercato";
    } else if (pct != null && pct < -5) {
      tone = "border-emerald-200 bg-emerald-50 text-emerald-950";
      label = "Tariffa competitiva";
      title = `La tua offerta è circa il ${Math.abs(pct)}% sotto la media considerata`;
      body = "Non emerge un vantaggio evidente nel cambiare solo per il prezzo della materia energia. Puoi comunque verificare condizioni e durata dell'offerta.";
    } else {
      tone = "border-emerald-200 bg-emerald-50 text-emerald-950";
      label = "Tariffa in linea";
      title = "Non emerge un sovrapprezzo significativo";
      body = "La componente confrontabile della bolletta è vicina alla media delle offerte considerate. Il dettaglio sotto mostra dove finiscono i tuoi soldi.";
    }
  }

  return (
    <section className={`rounded-2xl border p-6 ${tone}`}>
      <p className="text-xs font-semibold uppercase tracking-wide opacity-70">{label}</p>
      <h2 className="text-2xl font-bold mt-1">{title}</h2>
      <p className="text-sm mt-2 max-w-2xl">{body}</p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
        <Metric label="Totale bolletta" value={eur(data.importo_totale)} />
        {data.materia_energia?.totale_eur != null && <Metric label="Parte negoziabile" value={eur(data.materia_energia.totale_eur)} />}
        {savingMonth != null && savingMonth > 0 && <Metric label="Risparmio potenziale" value={`${eur(savingMonth)}/mese`} />}
        {savingYear != null && savingYear > 0 && <Metric label="Stima annuale" value={eur(savingYear)} />}
      </div>
      {action && (
        <a
          href="#confronto-mercato"
          className="mt-5 inline-flex items-center justify-center rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark transition-colors"
        >
          {action} →
        </a>
      )}
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-white/70 border border-current/10 px-3 py-2">
      <p className="text-[11px] uppercase tracking-wide opacity-60">{label}</p>
      <p className="text-sm font-bold mt-0.5">{value}</p>
    </div>
  );
}
