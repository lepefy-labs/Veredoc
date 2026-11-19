import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { praticheEnabled } from "@/lib/pratiche/feature";
import { publicGuides } from "@/lib/pratiche/public-guides";

export const dynamic = "force-dynamic";

const title = "Guide per le pratiche | Veredoc";
const description = "Scopri cosa preparare, dove presentare la richiesta e quali passaggi seguire per residenza, certificati anagrafici e ISEE.";

export const metadata: Metadata = {
  title, description,
  alternates: { canonical: "/guide" },
  openGraph: { title, description, url: "/guide", type: "website" },
};

export default async function GuidesPage() {
  if (!praticheEnabled()) notFound();
  const guides = await publicGuides();

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10 sm:px-6 sm:py-14">
      <h1 className="text-3xl font-bold tracking-tight text-ink sm:text-4xl">Guide per le pratiche</h1>
      <p className="mt-3 max-w-2xl leading-7 text-muted">Controlla i documenti da preparare, i passaggi da seguire e il servizio ufficiale a cui inviare la richiesta. Consulta le guide gratuitamente, senza account.</p>
      {guides.length ? (
        <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {guides.map(({ slug, title, description }) => (
            <li key={slug} className="rounded-xl border border-line bg-white p-5">
              <h2 className="text-lg font-semibold">
                <Link href={`/guide/${slug}`} className="inline-flex min-h-11 items-center text-brand hover:underline">{title}</Link>
              </h2>
              <p className="text-sm leading-6 text-muted">{description}</p>
            </li>
          ))}
        </ul>
      ) : <p className="mt-8 text-muted">Le guide sono in aggiornamento.</p>}
      <Link href="/per-i-caf" className="mt-8 inline-flex min-h-11 items-center text-sm font-semibold text-brand underline">Lavori in un CAF?</Link>
    </main>
  );
}
