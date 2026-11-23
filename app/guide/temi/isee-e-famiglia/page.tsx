import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { familyPaths, familyTopicPath } from "@/lib/pratiche/family-navigation";
import { praticheEnabled } from "@/lib/pratiche/feature";
import { publicGuides } from "@/lib/pratiche/public-guides";

export const dynamic = "force-dynamic";

const title = "ISEE, famiglia e agevolazioni | Veredoc";
const description = "Trova le guide per la DSU, l’ISEE corrente, l’Assegno unico, il bonus asilo nido e il bonus sociale in bolletta.";

export const metadata: Metadata = {
  title, description,
  alternates: { canonical: familyTopicPath },
  openGraph: { title, description, url: familyTopicPath, type: "website" },
};

export default async function FamilyTopicPage() {
  if (!praticheEnabled()) notFound();
  const guides = await publicGuides();
  const available = familyPaths.flatMap(({ slug, need }) => {
    const guide = guides.find((entry) => entry.slug === slug);
    return guide ? [{ ...guide, need }] : [];
  });

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6 sm:py-12">
      <Link href="/guide" className="inline-flex min-h-11 items-center text-sm font-semibold text-brand underline">Tutte le guide</Link>
      <h1 className="mt-2 text-3xl font-bold tracking-tight text-ink sm:text-4xl">ISEE, famiglia e bonus</h1>
      <p className="mt-3 max-w-xl leading-7 text-muted">Scegli la guida per sapere quali documenti tenere pronti, quali condizioni verificare e dove consultare il servizio ufficiale.</p>
      {available.length > 0 ? (
        <ul className="mt-6 divide-y divide-line rounded-xl border border-line bg-white">
          {available.map(({ slug, need, description }) => (
            <li key={slug} className="px-4 pb-4 pt-2 sm:px-5">
              <Link href={`/guide/${slug}`} className="inline-flex min-h-11 items-center font-semibold text-brand underline decoration-brand/30 underline-offset-4 hover:decoration-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand">{need}</Link>
              <p className="text-sm leading-6 text-muted">{description}</p>
            </li>
          ))}
        </ul>
      ) : <p role="status" className="mt-6 text-sm text-muted">Le guide per questo tema sono in aggiornamento.</p>}
    </main>
  );
}
