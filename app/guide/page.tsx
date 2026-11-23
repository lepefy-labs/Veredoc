import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { praticheEnabled } from "@/lib/pratiche/feature";
import { guideNavigation, guideTopics, searchGuideDirectory } from "@/lib/pratiche/guide-navigation";
import { publicGuides } from "@/lib/pratiche/public-guides";
import OfficialGuideLink from "@/components/pratiche/OfficialGuideLink";
import GuideSearchForm from "@/components/pratiche/GuideSearchForm";
import GuideSearchMeasurement from "@/components/pratiche/GuideSearchMeasurement";

export const dynamic = "force-dynamic";

const title = "Guide per le pratiche | Veredoc";
const description = "Trova guide gratuite e servizi ufficiali per permessi, cittadinanza, residenza, bollette, ISEE e bonus per le famiglie.";
const linkClass = "inline-flex min-h-11 items-center font-semibold text-brand underline decoration-brand/30 underline-offset-4 hover:decoration-brand";

type Props = { searchParams: Promise<{ q?: string | string[] }> };

function searchQuery(value: string | string[] | undefined) {
  return typeof value === "string" ? value.trim().slice(0, 120) : "";
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const query = searchQuery((await searchParams).q);
  return {
    title, description,
    alternates: { canonical: "/guide" },
    openGraph: { title, description, url: "/guide", type: "website" },
    ...(query ? { robots: { index: false, follow: true } } : {}),
  };
}

export default async function GuidesPage({ searchParams }: Props) {
  if (!praticheEnabled()) notFound();
  const [guides, { q }] = await Promise.all([publicGuides(), searchParams]);
  const query = searchQuery(q);
  const results = query ? searchGuideDirectory(guides, query) : [];

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6 sm:py-12">
      <h1 className="text-3xl font-bold tracking-tight text-ink sm:text-4xl">Guide per le pratiche</h1>
      <p className="mt-3 max-w-xl leading-7 text-muted">Trova i documenti da preparare, i passaggi da seguire e il servizio ufficiale. Le guide sono gratuite e senza account.</p>
      <div className="mt-6"><GuideSearchForm id="guide-search" query={query} /></div>

      {query ? (
        <section aria-labelledby="search-results" className="mt-8">
          <GuideSearchMeasurement hasResults={results.length > 0} />
          <h2 id="search-results" className="text-xl font-bold text-ink">Risultati per «{query}»</h2>
          {results.length ? (
            <ul className="mt-3 divide-y divide-line border-y border-line">
              {results.map(({ title, href, description, authority }) => (
                <li key={title} className="py-2 pb-3">
                  {authority
                    ? <OfficialGuideLink href={href} subject="ricerca-guide" className={linkClass}>{title}</OfficialGuideLink>
                    : <Link href={href} className={linkClass}>{title}</Link>}
                  <p className="text-sm leading-6 text-muted">{description}</p>
                  {authority && <p className="text-sm leading-6 text-muted">Fonte ufficiale: {authority}</p>}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 leading-7 text-muted">Nessun risultato. Prova a usare meno parole o scegli un argomento.</p>
          )}
          <Link href="/guide" className={linkClass}>Torna a tutte le guide</Link>
        </section>
      ) : null}

      <nav aria-label="Argomenti delle guide" className="mt-9">
        <h2 className="text-xl font-bold text-ink">Esplora per argomento</h2>
        <ul className="mt-3 grid gap-3 sm:grid-cols-2">
          {guideTopics.map(({ id, title, description, href }) => (
            <li key={id}>
              <Link href={href} className="group block rounded-xl border border-line bg-white p-4 hover:border-brand/50 hover:bg-brand-soft">
                <span className="font-semibold text-brand underline-offset-4 group-hover:underline">{title}</span>
                <span className="mt-1 block text-sm leading-6 text-muted">{description}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {!query && [...guideTopics.filter(({ id }) => id !== "immigrazione"), { id: "altre", title: "Altre guide" }].map(({ id, title }) => {
        const entries = guides.filter(({ slug }) => (guideNavigation[slug]?.topic ?? "altre") === id);
        if (!entries.length) return null;
        return (
          <section key={id} id={id} aria-labelledby={`topic-${id}`} className="mt-9 scroll-mt-24">
            <h2 id={`topic-${id}`} className="text-xl font-bold text-ink">{title}</h2>
            <ul className="mt-3 divide-y divide-line border-y border-line">
              {entries.map(({ slug, title, description }) => (
                <li key={slug} className="py-2 pb-3">
                  <h3><Link href={`/guide/${slug}`} className={linkClass}>{title}</Link></h3>
                  <p className="text-sm leading-6 text-muted">{description}</p>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
      {!query && !guides.length && <p className="mt-8 text-muted">Le guide sono in aggiornamento.</p>}
      <Link href="/per-i-caf" className={`mt-8 text-sm ${linkClass}`}>Lavori in un CAF?</Link>
    </main>
  );
}
