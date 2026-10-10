import Link from "next/link";

export const metadata = {
  title: "Informativa sulla Privacy — Veredoc",
};

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-page px-4 py-12">
      <div className="max-w-2xl mx-auto">
        <Link
          href="/"
          className="inline-block text-sm text-brand hover:underline mb-8"
        >
          ← Torna al sito
        </Link>

        <header className="mb-10">
          <h1 className="text-3xl font-bold text-ink mb-2">
            Informativa sulla Privacy
          </h1>
          <p className="text-muted text-sm">
            ai sensi del Regolamento UE 2016/679 — GDPR
          </p>
        </header>

        <div className="space-y-8 text-ink leading-relaxed text-sm">
          <section>
            <h2 className="font-semibold text-base mb-2">Titolare del trattamento</h2>
            <p>
              Veredoc —{" "}
              <a href="mailto:privacy@veredoc.it" className="text-brand hover:underline">
                privacy@veredoc.it
              </a>
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-base mb-2">Quali dati raccogliamo</h2>
            <ul className="list-disc list-inside space-y-1 text-ink">
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
              <li>
                Inviare all&apos;indirizzo dell&apos;account comunicazioni di servizio
                strettamente legate all&apos;uso di Veredoc (ad esempio analisi pronta,
                analisi ancora in corso o non completata, reimpostazione password), sulla
                base dell&apos;esecuzione del servizio richiesto (Art. 6.1.b GDPR). Queste
                email non contengono dati estratti dai documenti e non sono comunicazioni
                promozionali
              </li>
              <li>Migliorare la qualità del servizio in forma aggregata e anonima</li>
            </ul>
            <p className="mt-2 text-muted">
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
              <a href="mailto:privacy@veredoc.it" className="text-brand hover:underline">
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
                Il registro tecnico degli invii email di servizio (tipo di evento, esito,
                data) viene conservato per 90 giorni e non contiene il testo delle email
              </li>
              <li>
                L&apos;account può essere eliminato in qualsiasi momento dalla pagina
                Account: documenti, file caricati e analisi vengono cancellati subito;
                eventuali copie nei backup tecnici vengono eliminate entro 30 giorni
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
              Dalla pagina Account puoi scaricare una copia dei tuoi dati in formato
              JSON, modificare l&apos;indirizzo email ed eliminare l&apos;account.
            </p>
            <p className="mt-2">
              Per esercitare gli altri diritti:{" "}
              <a href="mailto:privacy@veredoc.it" className="text-brand hover:underline">
                privacy@veredoc.it
              </a>
            </p>
            <p className="mt-1">
              Per reclami: Garante per la protezione dei dati personali —{" "}
              <a
                href="https://www.garanteprivacy.it"
                target="_blank"
                rel="noopener noreferrer"
                className="text-brand hover:underline"
              >
                garanteprivacy.it
              </a>
            </p>
          </section>

          <section id="cookie" className="scroll-mt-20">
            <h2 className="font-semibold text-base mb-2">Cookie e archiviazione locale</h2>
            <ul className="list-disc list-inside space-y-1">
              <li>
                <strong>Cookie tecnici di sessione:</strong> necessari per l&apos;accesso
                all&apos;account e la protezione dei moduli. Non richiedono consenso.
              </li>
              <li>
                <strong>Statistiche di utilizzo:</strong> raccolte in forma aggregata con
                Vercel Analytics, senza cookie e senza profilazione.
              </li>
              <li>
                <strong>Archiviazione locale del browser:</strong> usata solo per ricordare
                preferenze dell&apos;interfaccia (ad esempio se hai chiuso il suggerimento di
                installazione dell&apos;app).
              </li>
            </ul>
            <p className="mt-2 text-muted">Non utilizziamo cookie di marketing o di profilazione.</p>
          </section>

          <section>
            <h2 className="font-semibold text-base mb-2">Aggiornamenti</h2>
            <p>
              Questa informativa può essere aggiornata. In caso di modifiche
              sostanziali, gli utenti registrati verranno notificati via email.
            </p>
          </section>
        </div>

        <footer className="mt-12 pt-6 border-t border-line text-xs text-muted">
          Ultimo aggiornamento: ottobre 2026
        </footer>
      </div>
    </main>
  );
}
