import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { praticheEnabled } from "@/lib/pratiche/feature";
import { publicGuide } from "@/lib/pratiche/public-guides";

export const dynamic = "force-dynamic";

const title = "Pilota ISEE per i CAF | Veredoc";
const description = "Prova con la tua sede una checklist prima dell’appuntamento ISEE e misura quanti fascicoli arrivano completi.";
const contact = "mailto:ciao@veredoc.it?subject=Pilota%20ISEE%20per%20i%20CAF";

export const metadata: Metadata = {
  title, description,
  alternates: { canonical: "/per-i-caf" },
  openGraph: { title, description, url: "/per-i-caf", type: "website" },
};

export default async function CafPilotPage() {
  if (!praticheEnabled()) notFound();
  const guide = await publicGuide("preparazione-dsu-isee");

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6 sm:py-14">
      <h1 className="text-3xl font-bold tracking-tight text-ink sm:text-4xl">Prepara gli appuntamenti ISEE prima che inizi il colloquio</h1>
      <p className="mt-4 max-w-2xl leading-7 text-muted">Cerchiamo sedi CAF per provare una checklist da inviare al momento della prenotazione. L’obiettivo è capire se arrivano più persone con i documenti necessari e quanto tempo guadagnano gli operatori.</p>
      <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2">
        <a href={contact} className="inline-flex min-h-11 items-center rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark">Proponi un pilota per la tua sede</a>
        {guide && <Link href={`/guide/${guide.slug}?da=caf`} className="inline-flex min-h-11 items-center text-sm font-semibold text-brand underline">Vedi la guida da condividere</Link>}
      </div>

      <section aria-labelledby="pilot-flow" className="mt-8 rounded-xl border border-line bg-white p-5 sm:p-6">
        <h2 id="pilot-flow" className="text-lg font-semibold text-ink">Come funziona</h2>
        <ol className="mt-4 list-decimal space-y-3 pl-5 text-sm leading-6 text-muted marker:font-semibold marker:text-brand">
          <li>La sede invia il link alla guida ISEE in fase di prenotazione. Il cittadino può leggerla gratis e salvare la checklist su Veredoc.</li>
          <li>All’appuntamento, il CAF controlla se i documenti bastano per procedere. Il cittadino consegna i documenti tramite i canali abituali della sede.</li>
          <li>Confrontiamo tempi e richieste di integrazione con gli appuntamenti preparati come di consueto.</li>
        </ol>
      </section>

      <section aria-labelledby="pilot-terms" className="mt-5 rounded-xl border border-line bg-white p-5 sm:p-6">
        <h2 id="pilot-terms" className="text-lg font-semibold text-ink">Condizioni proposte per il test</h2>
        <p className="mt-2 text-sm leading-6 text-muted">Proponiamo €2 per appuntamento in cui il cittadino ha usato la guida e l’operatore conferma che può procedere senza chiedere altri documenti. Prima dell’avvio concordiamo con la sede volume e modalità di rendicontazione.</p>
        <p className="mt-3 text-sm leading-6 text-muted">Per il primo contatto bastano nome della sede, città e volume indicativo di appuntamenti ISEE. Invia questi dati a <a href={contact} className="font-semibold text-brand underline">ciao@veredoc.it</a>.</p>
      </section>
    </main>
  );
}
