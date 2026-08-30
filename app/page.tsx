"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { TEXTS } from "@/lib/config/texts";
import VeredocLogo from "@/components/ui/VeredocLogo";
import PricingCardPro from "@/components/PricingCardPro";

export default function Home() {
  const { data: session } = useSession();

  return (
    <main className="min-h-screen flex flex-col items-center px-4 py-16 sm:py-20">
      <div className="max-w-2xl w-full text-center space-y-8">
        <div>
          <div className="flex justify-center">
            <VeredocLogo variant="full" size="lg" />
          </div>
          <h1 className="mt-5 text-3xl sm:text-4xl font-bold tracking-tight text-ink">{TEXTS.app.tagline}</h1>
          <p className="mt-3 text-lg text-muted max-w-xl mx-auto">{TEXTS.app.description}</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href={session ? "/analyze" : "/register"}
            className="inline-flex items-center justify-center px-7 py-3 bg-brand text-white rounded-lg font-semibold shadow-md shadow-brand/20 hover:bg-brand-dark transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          >
            Inizia gratis
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center justify-center px-6 py-3 bg-transparent text-brand border border-brand rounded-lg font-medium hover:bg-blue-50 transition-colors"
          >
            Accedi
          </Link>
        </div>
        <p className="text-sm text-muted text-center mt-1">Crea un account gratuito in 30 secondi — nessuna carta di credito richiesta.</p>

        <div className="mt-16 text-left">
          <h2 className="text-lg font-semibold text-ink text-center">Come funziona</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-left !mt-4">
          <div className="space-y-3">
            <p className="text-sm font-semibold text-muted uppercase tracking-wide">⚡ Bollette</p>
            {[
              { title: "Carica", body: "PDF, JPG o PNG. Veredoc riconosce automaticamente il tipo di bolletta." },
              { title: "Lettura AI", body: "L'AI identifica ogni voce (materia energia, oneri, tasse) e la spiega in italiano semplice." },
              { title: "Confronto prezzi", body: "Vedi se la tua tariffa è in linea col mercato e cosa conviene fare, con le alternative più interessanti quando disponibili." },
            ].map((item, i) => (
              <div key={item.title} className="bg-white rounded-xl border border-line p-5">
                <div className="flex items-center gap-2 mb-1">
                  <span aria-hidden="true" className="flex items-center justify-center w-5 h-5 rounded-full bg-brand-soft text-brand text-[11px] font-bold shrink-0">{i + 1}</span>
                  <p className="font-semibold text-brand">{item.title}</p>
                </div>
                <p className="text-sm text-muted">{item.body}</p>
              </div>
            ))}
          </div>

          <div className="space-y-3">
            <p className="text-sm font-semibold text-muted uppercase tracking-wide">📄 Buste paga</p>
            {[
              { title: "Carica", body: "PDF, JPG o PNG. Non devi indicare il tipo: Veredoc riconosce il cedolino automaticamente." },
              { title: "Lettura AI", body: "Estrae e spiega lordo, netto, contributi, imponibili, IRPEF, detrazioni, TFR e le principali voci del mese." },
              { title: "Controllo anomalie", body: "Verifica la quadratura del netto e segnala contributi, imponibili o trattenute che meritano un controllo." },
            ].map((item, i) => (
              <div key={item.title} className="bg-white rounded-xl border border-line p-5">
                <div className="flex items-center gap-2 mb-1">
                  <span aria-hidden="true" className="flex items-center justify-center w-5 h-5 rounded-full bg-brand-soft text-brand text-[11px] font-bold shrink-0">{i + 1}</span>
                  <p className="font-semibold text-brand">{item.title}</p>
                </div>
                <p className="text-sm text-muted">{item.body}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="text-left mt-8 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-ink">Ecco cosa ottieni</h2>
            <span className="text-xs bg-chip text-muted px-2 py-1 rounded-full font-medium">Esempio</span>
          </div>

          <div className="bg-success rounded-xl p-5 text-white">
            <p className="text-sm font-medium opacity-90">Stai pagando il 28% in più della media di mercato</p>
            <p className="font-mono text-4xl font-bold mt-1">€312<span className="text-xl font-semibold opacity-80">/anno</span></p>
            <p className="text-sm opacity-80 mt-1">Risparmio stimato</p>
          </div>

          <div className="bg-white rounded-xl border border-line overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line bg-page">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted">Voce</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-muted">Importo</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted hidden sm:table-cell">Cosa significa</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { voce: "Materia energia", importo: "€67,40", desc: "Il costo dell'energia che hai consumato (342 kWh × €0,197)" },
                  { voce: "Trasporto e gestione", importo: "€18,20", desc: "Costo fisso della rete di distribuzione" },
                  { voce: "Oneri di sistema", importo: "€9,80", desc: "Contributi obbligatori per incentivi rinnovabili" },
                  { voce: "Imposte e IVA", importo: "€14,60", desc: "IVA 10% + accisa" },
                ].map((row, i) => (
                  <tr key={i} className="border-b border-line last:border-0">
                    <td className="px-4 py-3 text-ink font-medium">{row.voce}</td>
                    <td className="px-4 py-3 text-right font-mono font-semibold text-ink">{row.importo}</td>
                    <td className="px-4 py-3 text-muted hidden sm:table-cell">{row.desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="bg-white rounded-xl border-2 border-success p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-semibold text-ink">💡 Illumia Luce Web — €0,142/kWh</p>
                <p className="text-sm text-muted mt-1">Risparmio stimato vs tariffa attuale: <span className="font-semibold text-success">€26/mese</span></p>
              </div>
              <Link
                href="#"
                className="shrink-0 inline-flex items-center justify-center px-4 py-2 bg-success text-white rounded-lg text-sm font-medium hover:bg-emerald-600 transition-colors"
              >
                Confronta →
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-16 bg-white border border-line rounded-2xl p-8 text-left">
          <h2 className="text-xl font-semibold text-ink text-center">I tuoi dati sono al sicuro</h2>
          <p className="text-sm text-muted text-center mt-1 mb-8">Veredoc tratta i tuoi documenti con la stessa cura che vorresti dal tuo commercialista.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {[
              { icon: "🔒", title: "Crittografia end-to-end", body: "I file viaggiano cifrati e sono salvati su infrastrutture europee. Nessun accesso esterno non autorizzato." },
              { icon: "🚫", title: "Zero training sull'AI", body: "I dati inviati all'AI non vengono usati per addestrare modelli. È garantito contrattualmente dal fornitore AI." },
              { icon: "🗑️", title: "Cancellazione su richiesta", body: "Puoi eliminare un documento in qualsiasi momento dalla dashboard. La cancellazione è immediata e permanente." },
              { icon: "🛡️", title: "Anonymizer PRO", body: "Con il piano PRO puoi oscurare visivamente le informazioni sensibili (codice fiscale, IBAN, POD) prima ancora che il documento lasci il tuo browser." },
            ].map((item) => (
              <div key={item.title} className="flex gap-3">
                <span className="text-2xl leading-none mt-0.5">{item.icon}</span>
                <div>
                  <p className="font-semibold text-ink">{item.title}</p>
                  <p className="text-sm text-muted mt-1">{item.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <section id="prezzi" className="mt-16 text-left">
          <h2 className="text-lg font-semibold text-ink text-center">{TEXTS.pricing.title}</h2>
          <p className="text-sm text-muted text-center mt-1 mb-8">{TEXTS.pricing.subtitle}</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl border border-line p-6 flex flex-col h-full">
              <span className="self-start text-[11px] font-semibold px-2 py-0.5 rounded-full bg-chip text-muted mb-4">
                {TEXTS.pricing.free.badge}
              </span>
              <div className="mb-1">
                <span className="text-3xl font-bold text-ink font-mono">{TEXTS.pricing.free.price}</span>
                <span className="text-sm text-muted"> / {TEXTS.pricing.free.period}</span>
              </div>
              <p className="text-xs text-success font-medium mt-1 mb-4 h-4"> </p>
              <ul className="space-y-2.5 text-sm text-ink flex-1">
                {TEXTS.pricing.free.features.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <span className="text-success font-bold mt-0.5" aria-hidden="true">✓</span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <Link
                href="/register"
                className="mt-6 inline-flex items-center justify-center px-5 py-3 bg-white text-brand border border-brand rounded-lg font-semibold hover:bg-brand-soft transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
              >
                {TEXTS.pricing.free.cta}
              </Link>
            </div>

            <PricingCardPro />
          </div>

          <p className="text-sm text-muted text-center mt-8">{TEXTS.pricing.dataNote}</p>
        </section>
      </div>
    </main>
  );
}
