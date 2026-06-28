import Link from "next/link";

export const metadata = {
  title: "Termini e Condizioni — Veredoc",
};

export default function TerminiPage() {
  return (
    <main className="min-h-screen bg-[#F8FAFC] px-4 py-12">
      <div className="max-w-2xl mx-auto">
        <Link
          href="/"
          className="inline-block text-sm text-[#1B4FD8] hover:underline mb-8"
        >
          ← Torna al sito
        </Link>

        <header className="mb-10">
          <h1 className="text-3xl font-bold text-[#0F172A] mb-2">
            Termini e Condizioni
          </h1>
          <p className="text-[#64748B] text-sm">
            Condizioni di utilizzo del servizio Veredoc
          </p>
        </header>

        <div className="space-y-8 text-[#0F172A] leading-relaxed text-sm">
          <section>
            <h2 className="font-semibold text-base mb-2">Cos&apos;è Veredoc</h2>
            <p>
              Veredoc è uno strumento digitale che analizza automaticamente documenti
              tramite intelligenza artificiale — bollette energetiche, bollette internet
              e buste paga — con l&apos;obiettivo di aiutare l&apos;utente a comprendere
              i propri costi e confrontarli con il mercato.
            </p>
            <p className="mt-2 text-[#64748B]">
              Veredoc è uno strumento informativo, non un servizio di consulenza. Le
              analisi prodotte hanno finalità orientativa e non costituiscono consulenza
              legale, fiscale, energetica o finanziaria.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-base mb-2">Utilizzo corretto del servizio</h2>
            <p className="mb-2">L&apos;utente si impegna a:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>
                Caricare esclusivamente documenti di cui è intestatario o per i quali ha
                ottenuto esplicito consenso dal titolare
              </li>
              <li>
                Non caricare documenti contenenti dati personali di terzi senza
                autorizzazione
              </li>
              <li>Non utilizzare il servizio per finalità illecite o fraudolente</li>
            </ul>
          </section>

          <section>
            <h2 className="font-semibold text-base mb-2">Limitazione di responsabilità</h2>
            <p className="mb-2">Veredoc non garantisce:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>
                L&apos;accuratezza assoluta delle analisi prodotte dall&apos;AI — i
                documenti italiani presentano formati eterogenei che possono influire
                sulla qualità dell&apos;estrazione
              </li>
              <li>
                La continuità del servizio — essendo in fase beta, possono verificarsi
                interruzioni
              </li>
              <li>
                L&apos;aggiornamento in tempo reale delle tariffe di mercato utilizzate
                per il confronto
              </li>
            </ul>
            <p className="mt-2 text-[#64748B]">
              L&apos;utente è responsabile di verificare le informazioni prima di
              prendere decisioni basate sull&apos;analisi di Veredoc.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-base mb-2">Proprietà intellettuale</h2>
            <p>
              Il servizio Veredoc, il suo codice, il design e i contenuti sono di
              proprietà del titolare. È vietata la riproduzione o l&apos;uso commerciale
              senza autorizzazione scritta. I documenti caricati dall&apos;utente restano
              di sua esclusiva proprietà.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-base mb-2">Modifiche al servizio</h2>
            <p>
              Il titolare si riserva il diritto di modificare, sospendere o interrompere
              il servizio in qualsiasi momento, specialmente durante la fase beta.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-base mb-2">Legge applicabile</h2>
            <p>
              I presenti Termini sono regolati dalla legge italiana. Per qualsiasi
              controversia è competente il foro del luogo di residenza del consumatore,
              ai sensi del Codice del Consumo.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-base mb-2">Contatto</h2>
            <p>
              <a href="mailto:privacy@veredoc.it" className="text-[#1B4FD8] hover:underline">
                privacy@veredoc.it
              </a>
            </p>
          </section>
        </div>

        <footer className="mt-12 pt-6 border-t border-[#E2E8F0] text-xs text-[#64748B]">
          Ultimo aggiornamento: giugno 2025
        </footer>
      </div>
    </main>
  );
}
