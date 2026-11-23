import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { praticheEnabled } from "@/lib/pratiche/feature";
import { immigrationResources, immigrationSections, immigrationTopicPath } from "@/lib/pratiche/guide-navigation";

export const dynamic = "force-dynamic";

const title = "Permessi di soggiorno e cittadinanza | Veredoc";
const description = "Trova documenti e servizi ufficiali per il permesso di soggiorno per famiglia, lavoro o studio, il ricongiungimento e la cittadinanza italiana.";

export const metadata: Metadata = {
  title, description,
  alternates: { canonical: immigrationTopicPath },
  openGraph: { title, description, url: immigrationTopicPath, type: "website" },
};

export default function ImmigrationTopicPage() {
  if (!praticheEnabled()) notFound();

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6 sm:py-12">
      <nav aria-label="Percorso">
        <ol className="flex flex-wrap items-center gap-x-2 text-sm">
          <li><Link href="/guide" className="inline-flex min-h-11 items-center font-semibold text-brand underline">Guide</Link></li>
          <li><span aria-hidden="true" className="mr-2 text-muted">/</span><span aria-current="page" className="text-muted">Permessi e cittadinanza</span></li>
        </ol>
      </nav>
      <h1 className="mt-2 text-3xl font-bold tracking-tight text-ink sm:text-4xl">Permessi e cittadinanza</h1>
      <p className="mt-3 max-w-xl leading-7 text-muted">Scegli cosa devi fare per trovare i documenti e il servizio ufficiale. Le richieste si presentano sui siti e agli sportelli degli enti indicati.</p>

      <nav aria-label="Scegli cosa devi fare" className="mt-6 rounded-xl border border-brand/20 bg-brand-soft p-4">
        <ul className="grid gap-x-5 sm:grid-cols-2">
          {immigrationSections.map(({ id, title }) => (
            <li key={id}><a href={`#${id}`} className="inline-flex min-h-11 items-center text-sm font-semibold text-brand underline underline-offset-4">{title}</a></li>
          ))}
        </ul>
      </nav>

      {immigrationSections.map(({ id, title }) => (
        <section key={id} id={id} aria-labelledby={`section-${id}`} className="mt-9 scroll-mt-24">
          <h2 id={`section-${id}`} className="text-xl font-bold text-ink">{title}</h2>
          <ul className="mt-3 divide-y divide-line border-y border-line">
            {immigrationResources.filter((resource) => resource.section === id).map(({ title, description, href, authority }) => (
              <li key={title} className="py-2 pb-3">
                <h3><a href={href} className="inline-flex min-h-11 items-center font-semibold text-brand underline decoration-brand/30 underline-offset-4 hover:decoration-brand">{title}</a></h3>
                <p className="text-sm leading-6 text-muted">{description}</p>
                <p className="text-sm leading-6 text-muted">Fonte ufficiale: {authority}</p>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </main>
  );
}
