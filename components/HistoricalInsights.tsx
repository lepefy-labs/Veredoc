import Link from "next/link";
import type { LongitudinalInsight, LongitudinalTone } from "@/lib/insights/history";

const toneClasses: Record<LongitudinalTone, { card: string; badge: string; dot: string }> = {
  warning: {
    card: "border-amber-200 bg-amber-50/60",
    badge: "bg-amber-100 text-amber-800",
    dot: "bg-amber-500",
  },
  positive: {
    card: "border-emerald-200 bg-emerald-50/60",
    badge: "bg-emerald-100 text-emerald-800",
    dot: "bg-emerald-500",
  },
  neutral: {
    card: "border-line bg-white",
    badge: "bg-chip text-muted",
    dot: "bg-brand",
  },
};

export default function HistoricalInsights({ insights }: { insights: LongitudinalInsight[] }) {
  if (insights.length === 0) return null;

  return (
    <section className="space-y-4" aria-labelledby="history-insights-title">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-brand">Storico intelligente</p>
          <h2 id="history-insights-title" className="text-xl font-bold text-ink mt-1">Cosa sta cambiando</h2>
          <p className="text-sm text-muted mt-1 max-w-2xl">
            Confrontiamo automaticamente l&apos;ultima analisi con la precedente dello stesso tipo, così non devi ricordarti numeri e variazioni a memoria.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {insights.map((insight) => {
          const tone = toneClasses[insight.tone];
          return (
            <article key={insight.id} className={`rounded-2xl border p-5 ${tone.card}`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${tone.dot}`} aria-hidden="true" />
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted">{insight.title}</p>
                  </div>
                  <h3 className="text-lg font-bold text-ink mt-2">{insight.headline}</h3>
                </div>
                <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${tone.badge}`}>
                  vs precedente
                </span>
              </div>

              <p className="text-sm text-muted mt-3 leading-6">{insight.summary}</p>

              {insight.metrics.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-4">
                  {insight.metrics.map((metric) => (
                    <div key={metric.label} className="rounded-lg bg-white/80 border border-white px-3 py-2">
                      <p className="text-[11px] text-muted">{metric.label}</p>
                      <p className="font-mono text-sm font-semibold text-ink mt-0.5">{metric.value}</p>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex flex-wrap gap-x-4 gap-y-2 mt-4 pt-4 border-t border-black/5">
                <Link href={`/analyze?id=${insight.currentDocumentId}`} className="text-sm font-semibold text-brand hover:text-brand-dark">
                  Apri ultima analisi →
                </Link>
                <Link href={`/analyze?id=${insight.previousDocumentId}`} className="text-sm text-muted hover:text-ink">
                  Vedi precedente
                </Link>
              </div>
            </article>
          );
        })}
      </div>

      <p className="text-xs text-faint">
        I confronti evidenziano variazioni nei dati estratti. Non sostituiscono verifiche contrattuali, fiscali o professionali quando necessarie.
      </p>
    </section>
  );
}
