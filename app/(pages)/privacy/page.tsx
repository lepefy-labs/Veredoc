import Link from "next/link";

export const metadata = {
  title: "Informativa sulla Privacy — Veredoc",
};

export default function PrivacyPage() {
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
            Informativa sulla Privacy
          </h1>
          <p className="text-[#64748B] text-sm">
            ai sensi del Regolamento UE 2016/679 — GDPR
          </p>
        </header>

        <div className="space-y-8 text-[#0F172A] leading-relaxed text-sm">
          <section>
            <h2 className="font-semibold text-base mb-2">Titolare del trattamento</h2>
            <p>
              Veredoc —{" "}
              <a href="mailto:privacy@veredoc.it" className="text-[#1B4FD8] hover:underline">
                privacy@veredoc.it
              </a>
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-base mb-2">Quali dati raccogliamo</h2>
            <ul className="list-disc list-inside space-y-1 text-[#0F172A]">
              <li>
                <strong>Dati di account:</strong> indirizzo email e password (in forma
                cifrata) forniti al momento della registrazione
              </li>
              <li>
                <strong>Documenti caricati:</strong> bollette energetiche, bollette
                internet, buste paga e altri documenti che l&apos;utente sceglie di
                caricare per l&apos;analisi
              </li>
              <li>
                <strong>Dati di utilizzo:</strong> numero di analisi effettuate, data e
                tipo di documento, stato dell&apos;elaborazione
              </li>
            </ul>
          </section>

          <section>
            <h2 className="font-semibold text-base mb-2">Finalità del trattamento</h2>
            <p className="mb-2">I dati vengono trattati esclusivamente per:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Erogare il servizio di analisi automatica dei documenti</li>
              <li>Gestire l&apos;account utente e l&apos;autenticazione</li>
              <li>Migliorare la qualità del servizio in forma aggregata e anonima</li>
            </ul>
            <p className="mt-2 text-[#64748B]">
              Non vengono effettuate attività di profilazione, marketing o cessione dati
              a terzi.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-base mb-2">
              Fornitori terzi e trasferimenti internazionali
            </h2>
            <p>
              Il servizio si avvale di fornitori terzi per hosting, database e
              elaborazione dei documenti. Alcuni di questi operano al di fuori
              dell&apos;Unione Europea. Tutti i trasferimenti extra-UE sono coperti da
              garanzie adeguate ai sensi dell&apos;Art. 46 GDPR (Standard Contractual
              Clauses). I fornitori agiscono come responsabili del trattamento e non
              utilizzano i dati per finalità proprie.
            </p>
            <p className="mt-2">
              Per conoscere i fornitori specifici:{" "}
              <a href="mailto:privacy@veredoc.it" className="text-[#1B4FD8] hover:underline">
                privacy@veredoc.it
              </a>
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-base mb-2">Conservazione dei dati</h2>
            <ul className="list-disc list-inside space-y-1">
              <li>
                I documenti caricati vengono conservati finché l&apos;utente non li
                elimina
              </li>
              <li>
                La funzione &quot;Elimina&quot; rimuove il file e azzera i dati estratti
                — restano solo metadati anonimi (data, tipo documento) per finalità
                statistiche
              </li>
              <li>
                In caso di cancellazione dell&apos;account, tutti i dati vengono
                eliminati entro 30 giorni
              </li>
            </ul>
          </section>

          <section>
            <h2 className="font-semibold text-base mb-2">Diritti dell&apos;utente</h2>
            <p>
              Ai sensi degli Art. 15-22 GDPR, l&apos;utente ha diritto di accesso,
              rettifica, cancellazione, portabilità e opposizione al trattamento.
            </p>
            <p className="mt-2">
              Per esercitare i propri diritti:{" "}
              <a href="mailto:privacy@veredoc.it" className="text-[#1B4FD8] hover:underline">
                privacy@veredoc.it
              </a>
            </p>
            <p className="mt-1">
              Per reclami: Garante per la protezione dei dati personali —{" "}
              <a
                href="https://www.garanteprivacy.it"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#1B4FD8] hover:underline"
              >
                garanteprivacy.it
              </a>
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-base mb-2">Aggiornamenti</h2>
            <p>
              Questa informativa può essere aggiornata. In caso di modifiche
              sostanziali, gli utenti registrati verranno notificati via email.
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
