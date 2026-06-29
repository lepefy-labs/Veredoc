"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { TEXTS } from "@/lib/config/texts";
import VeredocLogo from "@/components/ui/VeredocLogo";

export default function Home() {
  const { data: session } = useSession();
  const analyzeHref = session ? "/analyze" : "/login";

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4">
      <div className="max-w-2xl w-full text-center space-y-8">
        <div>
          <div className="flex justify-center">
            <VeredocLogo variant="full" size="lg" />
          </div>
          <p className="mt-3 text-xl text-[#0F172A] font-medium">{TEXTS.app.tagline}</p>
          <p className="mt-2 text-[#64748B]">{TEXTS.app.description}</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href={session ? "/analyze" : "/register"}
            className="inline-flex items-center justify-center px-6 py-3 bg-[#1B4FD8] text-white rounded-lg font-medium hover:bg-[#1640B0] transition-colors"
          >
            Inizia gratis
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center justify-center px-6 py-3 bg-transparent text-[#1B4FD8] border border-[#1B4FD8] rounded-lg font-medium hover:bg-blue-50 transition-colors"
          >
            Accedi
          </Link>
        </div>
        <p className="text-sm text-[#64748B] text-center mt-1">Crea un account gratuito in 30 secondi — nessuna carta di credito richiesta.</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-left mt-12">
          {/* Bollette column */}
          <div className="space-y-3">
            <p className="text-sm font-semibold text-[#64748B] uppercase tracking-wide">⚡ Bollette</p>
            {[
              { title: "Carica", body: "PDF, JPG o PNG. Nessun inserimento manuale di dati." },
              { title: "Lettura AI", body: "Claude identifica ogni voce (materia energia, oneri, tasse) e la spiega in italiano semplice." },
              { title: "Confronto prezzi", body: "Vedi se la tua tariffa è in linea col mercato. Se esiste un'offerta migliore, te la mostriamo." },
            ].map((item) => (
              <div key={item.title} className="bg-white rounded-xl border border-[#E2E8F0] p-5">
                <p className="font-semibold text-[#1B4FD8] mb-1">{item.title}</p>
                <p className="text-sm text-[#64748B]">{item.body}</p>
              </div>
            ))}
          </div>

          {/* Buste paga column */}
          <div className="space-y-3">
            <p className="text-sm font-semibold text-[#64748B] uppercase tracking-wide">📄 Buste paga</p>
            {[
              { title: "Carica", body: "PDF o JPG. Il documento non serve compilato: basta fotografarlo." },
              { title: "Lettura AI", body: "Ogni voce spiegata: RAL, trattenute IRPEF, contributi INPS, ferie maturate, TFR." },
              { title: "Verifica calcoli", body: "Controlla se l'aliquota fiscale applicata è quella giusta per il tuo reddito." },
            ].map((item) => (
              <div key={item.title} className="bg-white rounded-xl border border-[#E2E8F0] p-5">
                <p className="font-semibold text-[#1B4FD8] mb-1">{item.title}</p>
                <p className="text-sm text-[#64748B]">{item.body}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Mockup risultato analisi */}
        <div className="text-left mt-8 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-[#0F172A]">Ecco cosa ottieni</h2>
            <span className="text-xs bg-[#F1F5F9] text-[#64748B] px-2 py-1 rounded-full font-medium">Esempio</span>
          </div>

          {/* Banner risparmio */}
          <div className="bg-[#10B981] rounded-xl p-5 text-white">
            <p className="text-sm font-medium opacity-90">Stai pagando il 28% in più della media di mercato</p>
            <p className="font-mono text-4xl font-bold mt-1">€312<span className="text-xl font-semibold opacity-80">/anno</span></p>
            <p className="text-sm opacity-80 mt-1">Risparmio stimato</p>
          </div>

          {/* Tabella voci */}
          <div className="bg-white rounded-xl border border-[#E2E8F0] overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#E2E8F0] bg-[#F7F9FC]">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[#64748B]">Voce</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-[#64748B]">Importo</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[#64748B] hidden sm:table-cell">Cosa significa</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { voce: "Materia energia", importo: "€67,40", desc: "Il costo dell'energia che hai consumato (342 kWh × €0,197)" },
                  { voce: "Trasporto e gestione", importo: "€18,20", desc: "Costo fisso della rete di distribuzione" },
                  { voce: "Oneri di sistema", importo: "€9,80", desc: "Contributi obbligatori per incentivi rinnovabili" },
                  { voce: "Imposte e IVA", importo: "€14,60", desc: "IVA 10% + accisa" },
                ].map((row, i) => (
                  <tr key={i} className="border-b border-[#E2E8F0] last:border-0">
                    <td className="px-4 py-3 text-[#0F172A] font-medium">{row.voce}</td>
                    <td className="px-4 py-3 text-right font-mono font-semibold text-[#0F172A]">{row.importo}</td>
                    <td className="px-4 py-3 text-[#64748B] hidden sm:table-cell">{row.desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Card alternativa mercato */}
          <div className="bg-white rounded-xl border-2 border-[#10B981] p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-semibold text-[#0F172A]">💡 Illumia Luce Web — €0,142/kWh</p>
                <p className="text-sm text-[#64748B] mt-1">Risparmio stimato vs tariffa attuale: <span className="font-semibold text-[#10B981]">€26/mese</span></p>
              </div>
              <Link
                href="#"
                className="shrink-0 inline-flex items-center justify-center px-4 py-2 bg-[#10B981] text-white rounded-lg text-sm font-medium hover:bg-emerald-600 transition-colors"
              >
                Confronta →
              </Link>
            </div>
          </div>
        </div>

        {/* Trust & Privacy */}
        <div className="mt-16 bg-white border border-[#E2E8F0] rounded-2xl p-8 text-left">
          <h2 className="text-xl font-semibold text-[#0F172A] text-center">I tuoi dati sono al sicuro</h2>
          <p className="text-sm text-[#64748B] text-center mt-1 mb-8">Veredoc tratta i tuoi documenti con la stessa cura che vorresti dal tuo commercialista.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {[
              { icon: "🔒", title: "Crittografia end-to-end", body: "I file viaggiano cifrati e sono salvati su infrastrutture europee (Supabase EU). Nessun accesso esterno non autorizzato." },
              { icon: "🚫", title: "Zero training sull'AI", body: "I dati inviati all'AI non vengono usati per addestrare modelli. È garantito contrattualmente dal fornitore AI (Anthropic)." },
              { icon: "🗑️", title: "Cancellazione su richiesta", body: "Puoi eliminare un documento in qualsiasi momento dalla dashboard. La cancellazione è immediata e permanente." },
              { icon: "🛡️", title: "Anonymizer PRO", body: "Con il piano PRO puoi oscurare visivamente le informazioni sensibili (codice fiscale, IBAN, POD) prima ancora che il documento lasci il tuo browser." },
            ].map((item) => (
              <div key={item.title} className="flex gap-3">
                <span className="text-2xl leading-none mt-0.5">{item.icon}</span>
                <div>
                  <p className="font-semibold text-[#0F172A]">{item.title}</p>
                  <p className="text-sm text-[#64748B] mt-1">{item.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
