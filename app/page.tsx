import Link from "next/link";
import GuideSearchForm from "@/components/pratiche/GuideSearchForm";
import PricingCardPro from "@/components/PricingCardPro";
import { TEXTS } from "@/lib/config/texts";
import { praticheEnabled } from "@/lib/pratiche/feature";
import { guideTopics } from "@/lib/pratiche/guide-navigation";
import { publicGuides } from "@/lib/pratiche/public-guides";

export const dynamic = "force-dynamic";

const featuredSlugs = ["preparazione-dsu-isee", "cambio-residenza", "assegno-unico"];
const examples = ["Devo richiedere l’ISEE", "Mi sono trasferito", "Mi è scaduto il permesso"];
const topics = [
  ...guideTopics,
  { id: "lavoro", title: "Lavoro e reddito", description: "Leggi le voci della tua busta paga.", href: "/analyze" },
];

const action = "inline-flex min-h-11 items-center font-semibold text-brand underline decoration-brand/30 underline-offset-4 hover:decoration-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand";

export default async function Home() {
  if (!praticheEnabled()) return <DocumentHome />;
  const guides = await publicGuides();
  const featured = featuredSlugs.flatMap((slug) => {
    const guide = guides.find((entry) => entry.slug === slug);
    return guide ? [guide] : [];
  });

  return (
    <main className="flex-1">
      <section className="border-b border-line bg-white">
        <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-20">
          <h1 className="max-w-3xl text-4xl font-bold tracking-tight text-ink sm:text-6xl">Cosa devi risolvere?</h1>
          <p className="mt-4 max-w-xl text-lg leading-7 text-muted">Trova una guida, prepara i documenti e scopri dove presentare la pratica.</p>
          <div className="mt-7"><GuideSearchForm id="home-search" label="Cerca per bisogno o argomento" /></div>
          <ul aria-label="Esempi di ricerca" className="mt-3 flex flex-wrap gap-2">
            {examples.map((query) => <li key={query}>
              <Link href={`/guide?q=${encodeURIComponent(query)}`} prefetch={false} className="inline-flex min-h-11 items-center rounded-full border border-line px-4 text-sm font-medium text-ink hover:border-brand hover:text-brand focus-visible:outline-2 focus-visible:outline-brand">{query}</Link>
            </li>)}
          </ul>
          <div className="mt-4 flex flex-wrap gap-x-6">
            <Link href="/guide" className={action}>Leggi le guide gratuite</Link>
            <Link href="/analyze" className={action}>Analizza un documento</Link>
          </div>
        </div>
      </section>
      <div className="mx-auto max-w-5xl space-y-10 px-4 py-10 sm:px-6 sm:py-14">
        <section aria-labelledby="home-topics">
          <h2 id="home-topics" className="text-2xl font-bold tracking-tight text-ink">Esplora per argomento</h2>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {topics.map(({ id, title, description, href }) => <li key={id}>
              <Link href={href} className="block h-full rounded-xl border border-line bg-white p-4 hover:border-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand">
                <span className="font-semibold text-brand">{title}</span>
                <span className="mt-1 block text-sm leading-6 text-muted">{description}</span>
              </Link>
            </li>)}
          </ul>
        </section>
        {featured.length > 0 && <section aria-labelledby="home-featured">
          <h2 id="home-featured" className="text-2xl font-bold tracking-tight text-ink">Guide in evidenza</h2>
          <ul className="mt-4 grid gap-3 md:grid-cols-3">
            {featured.map(({ slug, title, description }) => <li key={slug} className="rounded-xl border border-line bg-white px-4 pb-4 pt-2">
              <Link href={`/guide/${slug}`} className={action}>{title}</Link>
              <p className="text-sm leading-6 text-muted">{description}</p>
            </li>)}
          </ul>
        </section>}
        <section aria-labelledby="home-how" className="rounded-2xl bg-brand-soft p-5 sm:p-7">
          <h2 id="home-how" className="text-2xl font-bold tracking-tight text-ink">Come funziona</h2>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-6 text-ink">
            <li>Apri una guida gratuita e consulta i requisiti e le fonti.</li>
            <li>Se è disponibile una checklist, accedi per salvare i tuoi progressi.</li>
            <li>Quando hai tutto pronto, usa il servizio ufficiale indicato nella guida.</li>
          </ol>
        </section>
      </div>
    </main>
  );
}

function DocumentHome() {
  return (
    <main className="flex-1">
      <section className="border-b border-line bg-white">
        <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-20">
          <h1 className="text-4xl font-bold tracking-tight text-ink sm:text-6xl">Capisci meglio bollette e buste paga.</h1>
          <p className="mt-4 max-w-xl text-lg leading-7 text-muted">Carica un documento per leggere le voci principali e capire quali punti meritano una verifica.</p>
          <Link href="/analyze" className={`${action} mt-5`}>Analizza un documento</Link>
        </div>
      </section>
      <section id="prezzi" className="mx-auto w-full max-w-4xl px-4 py-16 sm:px-6 sm:py-20">
        <div className="text-center"><p className="text-xs font-bold uppercase tracking-[0.14em] text-brand">Analisi documenti</p><h2 className="mt-3 text-3xl font-bold tracking-tight text-ink sm:text-4xl">{TEXTS.pricing.title}</h2><p className="mt-3 text-muted">Questi piani riguardano l’analisi di bollette e buste paga.</p></div>
        <div className="mt-10 grid gap-6 sm:grid-cols-2">
          <div className="flex h-full flex-col rounded-2xl border border-line bg-white p-6">
            <span className="mb-4 self-start rounded-full bg-chip px-2 py-0.5 text-[11px] font-semibold text-muted">{TEXTS.pricing.free.badge}</span>
            <p><span className="font-mono text-3xl font-bold text-ink">{TEXTS.pricing.free.price}</span><span className="text-sm text-muted"> / {TEXTS.pricing.free.period}</span></p>
            <ul className="mt-6 flex-1 space-y-2.5 text-sm text-ink">{TEXTS.pricing.free.features.map((feature) => <li key={feature} className="flex items-start gap-2"><span aria-hidden="true" className="font-bold text-success">✓</span><span>{feature}</span></li>)}</ul>
            <Link href="/register" className="mt-6 inline-flex min-h-12 items-center justify-center rounded-lg border border-brand px-5 font-semibold text-brand transition-colors hover:bg-brand-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand">{TEXTS.pricing.free.cta}</Link>
          </div>
          <PricingCardPro />
        </div>
        <p className="mt-8 text-center text-sm text-muted">{TEXTS.pricing.dataNote}</p>
      </section>
    </main>
  );
}
