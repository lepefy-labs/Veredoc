import Link from "next/link";

interface PlanUsageProps {
  plan: "FREE" | "PRO";
  used: number;
  limit: number;
  // Variante compatta per la dashboard, con link alla pagina account.
  compact?: boolean;
}

export const PRO_CONTACT_EMAIL = "ciao@veredoc.it";

export default function PlanUsage({ plan, used, limit, compact = false }: PlanUsageProps) {
  const pct = Math.min(100, Math.round((used / Math.max(limit, 1)) * 100));
  const isPro = plan === "PRO";
  const nextReset = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth() + 1, 1))
    .toLocaleDateString("it-IT", { day: "numeric", month: "long" });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-1">
          <p className="text-sm font-semibold text-ink">Il tuo piano</p>
          <p className="text-sm text-muted">
            {isPro
              ? "Piano PRO: hai accesso a tutte le funzionalità disponibili."
              : compact
                ? "Piano gratuito."
                : `Piano gratuito. Il pagamento online di PRO non è ancora attivo: per passare a PRO scrivi a ${PRO_CONTACT_EMAIL}.`}
          </p>
        </div>
        <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${isPro ? "bg-success text-white" : "bg-line text-muted"}`}>{plan}</span>
      </div>
      <div>
        <div className="mb-1.5 flex items-baseline justify-between">
          <p className="text-xs text-muted">Analisi utilizzate questo mese</p>
          <p className="font-mono text-xs font-semibold text-ink">{used} / {limit}</p>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-line" role="progressbar" aria-valuenow={used} aria-valuemin={0} aria-valuemax={limit} aria-label="Analisi utilizzate questo mese">
          <div className={`h-full rounded-full transition-all ${pct >= 100 ? "bg-danger" : pct >= 80 ? "bg-[#F59E0B]" : "bg-brand"}`} style={{ width: `${pct}%` }} />
        </div>
        <p className={`mt-1.5 text-xs ${pct >= 100 ? "text-danger" : "text-muted"}`}>
          {pct >= 100 ? "Hai esaurito le analisi del mese. " : ""}Il contatore si azzera il {nextReset}.
        </p>
      </div>
      {compact && (
        <Link href="/account" className="inline-flex text-sm font-medium text-brand hover:underline">Gestisci account →</Link>
      )}
    </div>
  );
}
