import Card from "@/components/ui/Card";
import { BustaPagaData, PayrollBalance, PayrollCheck, PayrollPeriodEvent } from "@/types/bustapaga";
import { calcolaAliquotaEffettiva } from "@/lib/parsers/bustapaga";

interface BustaPagaReportProps {
  data: BustaPagaData;
}

function verdictStyle(verdict: BustaPagaData["verifica"] extends infer V ? V extends { verdict: infer T } ? T : never : never) {
  if (verdict === "da_verificare") return "border-amber-300 bg-amber-50 text-amber-900";
  if (verdict === "coerente") return "border-emerald-200 bg-emerald-50 text-emerald-900";
  return "border-blue-200 bg-blue-50 text-blue-900";
}

function checkStyle(level: PayrollCheck["level"]) {
  if (level === "warning") return "border-amber-200 bg-amber-50";
  if (level === "ok") return "border-emerald-200 bg-emerald-50";
  return "border-line bg-page";
}

function checkIcon(level: PayrollCheck["level"]) {
  if (level === "warning") return "!";
  if (level === "ok") return "✓";
  return "i";
}

const BALANCE_LABELS: Record<PayrollBalance["tipo"], string> = {
  ferie: "Ferie",
  permessi: "Permessi",
  rol: "ROL",
  ex_festivita: "Ex festività",
  altro: "Altro saldo",
};

const EVENT_LABELS: Record<PayrollPeriodEvent["tipo"], string> = {
  straordinario: "Straordinario",
  premio: "Premio",
  assenza: "Assenza",
  malattia: "Malattia",
  ferie: "Ferie",
  permesso: "Permesso",
  altro: "Altra voce",
};

function numberValue(value: number | null, unit: string | null): string {
  if (value == null) return "—";
  return `${value.toLocaleString("it-IT", { maximumFractionDigits: 2 })}${unit ? ` ${unit}` : ""}`;
}

function moneyValue(value: number | null): string {
  if (value == null) return "—";
  return value.toLocaleString("it-IT", { style: "currency", currency: "EUR" });
}

export default function BustaPagaReport({ data }: BustaPagaReportProps) {
  const aliquota = calcolaAliquotaEffettiva(data);
  const verifica = data.verifica;
  const balances = data.saldi_assenze ?? [];
  const events = data.eventi_periodo ?? [];
  const hasOperationalData = balances.length > 0 || events.length > 0 || data.tfr_progressivo != null;

  return (
    <div className="space-y-6">
      {verifica && (
        <section className={`rounded-2xl border p-6 ${verdictStyle(verifica.verdict)}`}>
          <p className="text-xs font-semibold uppercase tracking-wide opacity-70">Controllo automatico del cedolino</p>
          <h2 className="text-2xl font-bold mt-1">{verifica.title}</h2>
          <p className="text-sm mt-2 max-w-2xl">{verifica.summary}</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-5">
            {verifica.checks.map((check) => (
              <div key={check.id} className={`rounded-xl border p-4 ${checkStyle(check.level)}`}>
                <div className="flex items-start gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-current text-xs font-bold">
                    {checkIcon(check.level)}
                  </span>
                  <div>
                    <p className="text-sm font-semibold">{check.title}</p>
                    <p className="text-xs mt-1 opacity-80">{check.summary}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <p className="text-xs mt-5 opacity-70">
            Veredoc controlla coerenza matematica e valori anomali visibili nel cedolino. Contratto, conguagli e situazione fiscale annuale possono richiedere una verifica professionale.
          </p>
        </section>
      )}

      <Card>
        <div className="flex items-center justify-between gap-4 mb-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">Il tuo mese in breve</p>
            <h3 className="font-semibold text-ink mt-1">Da lordo a netto</h3>
          </div>
          <span className="text-2xl font-bold font-mono text-success">
            {data.stipendio_netto.toLocaleString("it-IT", { style: "currency", currency: "EUR" })}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Stat label="Datore di lavoro" value={data.datore_lavoro} />
          <Stat label="Competenza" value={data.competenza} />
          <Stat label="Lordo" value={data.stipendio_lordo.toLocaleString("it-IT", { style: "currency", currency: "EUR" })} mono />
          <Stat label="Netto" value={data.stipendio_netto.toLocaleString("it-IT", { style: "currency", currency: "EUR" })} mono highlight />
        </div>
      </Card>

      {hasOperationalData && (
        <Card>
          <div className="mb-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-brand">Cosa è successo questo mese</p>
            <h3 className="font-semibold text-ink mt-1">Ferie, permessi, TFR e voci variabili</h3>
            <p className="text-sm text-muted mt-1">Mostriamo solo dati esplicitamente letti dal cedolino, senza ricostruire valori mancanti.</p>
          </div>

          {balances.length > 0 && (
            <div className="space-y-3 mb-5">
              <p className="text-sm font-semibold text-ink">Saldi tempo</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {balances.map((balance, index) => (
                  <div key={`${balance.tipo}-${index}`} className="rounded-xl border border-line bg-page p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-ink">{BALANCE_LABELS[balance.tipo]}</p>
                      <span className={`text-xs font-semibold ${balance.residuo != null && balance.residuo < 0 ? "text-danger" : "text-brand"}`}>
                        Residuo {numberValue(balance.residuo, balance.unita)}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-3 mt-3 text-xs">
                      <div><p className="text-muted">Maturato</p><p className="font-mono font-semibold text-ink">{numberValue(balance.maturato, balance.unita)}</p></div>
                      <div><p className="text-muted">Goduto</p><p className="font-mono font-semibold text-ink">{numberValue(balance.goduto, balance.unita)}</p></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {data.tfr_progressivo != null && (
            <div className="rounded-xl border border-line p-4 mb-5 flex items-center justify-between gap-4">
              <div><p className="text-sm font-semibold text-ink">TFR progressivo</p><p className="text-xs text-muted mt-0.5">Valore riportato nel cedolino</p></div>
              <p className="font-mono text-lg font-bold text-ink">{moneyValue(data.tfr_progressivo)}</p>
            </div>
          )}

          {events.length > 0 && (
            <div className="space-y-3">
              <p className="text-sm font-semibold text-ink">Voci variabili del periodo</p>
              {events.map((event, index) => (
                <div key={`${event.tipo}-${event.descrizione}-${index}`} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 rounded-lg border border-line px-3 py-3">
                  <div className="flex-1 min-w-0">
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-brand">{EVENT_LABELS[event.tipo]}</span>
                    <p className="text-sm font-medium text-ink truncate">{event.descrizione}</p>
                  </div>
                  {event.quantita != null && <p className="text-xs font-mono text-muted">{numberValue(event.quantita, event.unita)}</p>}
                  {event.importo != null && <p className="text-sm font-mono font-semibold text-ink">{moneyValue(event.importo)}</p>}
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      <Card>
        <h3 className="font-semibold text-ink mb-4">Trattenute e imponibili</h3>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Stat label="Contributi INPS" value={data.contributi_inps.toLocaleString("it-IT", { style: "currency", currency: "EUR" })} mono />
          <Stat label="IRPEF" value={data.irpef.toLocaleString("it-IT", { style: "currency", currency: "EUR" })} mono />
          <Stat label="Incidenza trattenute principali" value={`${aliquota}%`} mono />
          {data.tfr_maturato != null && <Stat label="TFR maturato nel periodo" value={moneyValue(data.tfr_maturato)} mono />}
          {data.imponibile_previdenziale != null && <Stat label="Imponibile previdenziale" value={moneyValue(data.imponibile_previdenziale)} mono />}
          {data.imponibile_fiscale != null && <Stat label="Imponibile fiscale" value={moneyValue(data.imponibile_fiscale)} mono />}
          {data.detrazioni != null && <Stat label="Detrazioni" value={moneyValue(data.detrazioni)} mono />}
          {data.addizionali != null && <Stat label="Addizionali" value={moneyValue(data.addizionali)} mono />}
        </div>
      </Card>

      <Card>
        <details>
          <summary className="cursor-pointer list-none flex items-center justify-between gap-4 font-semibold text-ink">
            <span>Voci della busta paga</span>
            <span className="text-xs font-normal text-muted">Apri dettaglio</span>
          </summary>
          <div className="space-y-1 mt-5">
            <div className="flex text-xs text-muted uppercase tracking-wide px-3 py-1">
              <span className="flex-1">Voce</span>
              <span className="w-28 text-right">Importo</span>
              <span className="w-28 text-right hidden sm:block">Tipo</span>
            </div>
            {data.voci.map((voce, i) => (
              <div key={i} className="flex items-start gap-4 px-3 py-3 rounded-lg hover:bg-page border-b border-line last:border-0">
                <div className="flex-1">
                  <p className="text-sm font-medium text-ink">{voce.nome}</p>
                  <p className="text-xs text-muted mt-0.5">{voce.spiegazione}</p>
                </div>
                <p className={`font-mono text-sm font-semibold w-28 text-right ${voce.tipo === "trattenuta" ? "text-danger" : "text-success"}`}>
                  {voce.tipo === "trattenuta" ? "-" : "+"}{Math.abs(voce.importo).toLocaleString("it-IT", { style: "currency", currency: "EUR" })}
                </p>
                <span className={`hidden sm:block text-xs px-2 py-0.5 rounded-full w-28 text-center ${voce.tipo === "trattenuta" ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}>
                  {voce.tipo === "trattenuta" ? "Trattenuta" : "Competenza"}
                </span>
              </div>
            ))}
          </div>
        </details>
      </Card>
    </div>
  );
}

function Stat({ label, value, mono, highlight }: { label: string; value: string; mono?: boolean; highlight?: boolean }) {
  return (
    <div>
      <p className="text-xs text-muted uppercase tracking-wide mb-0.5">{label}</p>
      <p className={`text-sm font-semibold ${mono ? "font-mono" : ""} ${highlight ? "text-success text-base" : "text-ink"}`}>{value}</p>
    </div>
  );
}
