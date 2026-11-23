import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import PracticalGuide from "@/components/pratiche/PracticalGuide";
import { publicGuide, publicGuides } from "@/lib/pratiche/public-guides";

export const dynamic = "force-dynamic";

const origin = "https://www.veredoc.it";
const reviewDateFormat = new Intl.DateTimeFormat("it-IT", { dateStyle: "long", timeZone: "UTC" });

const relatedSlugs: Readonly<Record<string, readonly string[]>> = {
  "cambio-residenza": ["voltura-o-subentro-luce-gas"],
  "preparazione-dsu-isee": ["assegno-unico", "bonus-asilo-nido", "isee-corrente", "bonus-sociale-luce-gas-acqua", "bonus-nuovi-nati-2026"],
  "assegno-unico": ["preparazione-dsu-isee", "bonus-asilo-nido", "bonus-nuovi-nati-2026"],
  "bonus-asilo-nido": ["preparazione-dsu-isee", "assegno-unico", "bonus-nuovi-nati-2026"],
  "bonus-sociale-luce-gas-acqua": ["preparazione-dsu-isee", "isee-corrente", "come-leggere-bolletta-luce-gas"],
  "come-leggere-bolletta-luce-gas": ["bonus-sociale-luce-gas-acqua", "voltura-o-subentro-luce-gas"],
  "voltura-o-subentro-luce-gas": ["cambio-residenza", "come-leggere-bolletta-luce-gas"],
  "isee-corrente": ["preparazione-dsu-isee", "bonus-sociale-luce-gas-acqua"],
  "bonus-nuovi-nati-2026": ["preparazione-dsu-isee", "assegno-unico", "bonus-asilo-nido"],
};

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ da?: string | string[] }>;
};

export async function generateMetadata({ params }: Pick<Props, "params">): Promise<Metadata> {
  const { slug } = await params;
  const item = await publicGuide(slug);
  if (!item) return { robots: { index: false, follow: false } };
  const url = `/guide/${item.slug}`;
  const title = `${item.title} | Veredoc`;

  return {
    title, description: item.description,
    alternates: { canonical: url },
    openGraph: {
      title, description: item.description, url, siteName: "Veredoc", locale: "it_IT",
      ...(item.lastModified
        ? { type: "article", modifiedTime: item.lastModified }
        : { type: "website" }),
    },
    twitter: { card: "summary", title, description: item.description },
  };
}

export default async function PublicGuidePage({ params, searchParams }: Props) {
  const [{ slug }, { da }] = await Promise.all([params, searchParams]);
  const item = await publicGuide(slug);
  if (!item) notFound();
  const related = (await publicGuides()).filter((candidate) => relatedSlugs[slug]?.includes(candidate.slug));
  const isBillGuide = slug === "come-leggere-bolletta-luce-gas";
  const url = new URL(`/guide/${item.slug}`, origin).href;
  const publisher = { "@type": "Organization", name: "Veredoc", url: origin };
  const article = item.lastModified ? {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: item.title,
    description: item.description,
    url,
    mainEntityOfPage: url,
    inLanguage: "it",
    dateModified: item.lastModified,
    author: publisher,
    publisher,
  } : null;
  const entryPoint = slug === "preparazione-dsu-isee" && da === "caf" ? "caf_pilot" : "public_guide";

  return (
    <main className="public-guide-print mx-auto w-full max-w-3xl flex-1 px-4 pb-24 pt-8 sm:px-6 sm:pb-12 print:max-w-none print:p-0">
      <Link href="/guide" className="inline-flex min-h-11 items-center text-sm font-semibold text-brand print:hidden">← Tutte le guide</Link>
      <h1 className="mt-3 text-3xl font-bold tracking-tight text-ink sm:text-4xl">{item.title}</h1>
      <p className="mt-3 leading-7 text-muted">{item.description}</p>
      {item.reviewedOn && (
        <p className="mt-2 text-sm text-muted">
          Fonti verificate il <time dateTime={item.reviewedOn}>{reviewDateFormat.format(new Date(item.reviewedOn))}</time>
        </p>
      )}
      {article && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(article).replace(/</g, "\\u003c") }}
        />
      )}
      <PracticalGuide guide={item.guide} checklistEdition={item.versionId} />
      <section aria-labelledby="save-checklist" className="mt-6 rounded-xl border border-line bg-white p-5 sm:p-6 print:hidden">
        <h2 id="save-checklist" className="text-lg font-semibold text-ink">
          {isBillGuide ? "Analizza la tua bolletta" : "Apri la pratica guidata"}
        </h2>
        <p className="mt-2 text-sm leading-6 text-muted">
          {isBillGuide
            ? "Accedi per caricare una bolletta e vedere un riepilogo di costi, consumi e condizioni."
            : "Accedi per salvare i passaggi della pratica nel tuo account. Le spunte di questa pagina restano nel browser."}
        </p>
        <Link href={isBillGuide ? "/analyze" : `/pratiche/${item.slug}?da=${entryPoint}`} prefetch={false} className="mt-4 inline-flex min-h-11 items-center rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark">
          {isBillGuide ? "Vai all’analisi della bolletta" : "Continua con la checklist"}
        </Link>
      </section>
      {related.length > 0 && <section aria-labelledby="related-guides" className="mt-6 rounded-xl border border-line bg-white p-5 print:hidden">
        <h2 id="related-guides" className="text-lg font-semibold text-ink">Guide collegate</h2>
        <ul className="mt-2">
          {related.map((candidate) => <li key={candidate.slug}>
            <Link href={`/guide/${candidate.slug}`} className="inline-flex min-h-11 items-center text-sm font-semibold text-brand underline">
              {candidate.title}
            </Link>
          </li>)}
        </ul>
      </section>}
    </main>
  );
}
