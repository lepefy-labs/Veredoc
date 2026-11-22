import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import PracticalGuide from "@/components/pratiche/PracticalGuide";
import { publicGuide } from "@/lib/pratiche/public-guides";

export const dynamic = "force-dynamic";

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
    openGraph: { title, description: item.description, url, type: "website" },
    twitter: { card: "summary", title, description: item.description },
  };
}

export default async function PublicGuidePage({ params, searchParams }: Props) {
  const [{ slug }, { da }] = await Promise.all([params, searchParams]);
  const item = await publicGuide(slug);
  if (!item) notFound();
  const entryPoint = slug === "preparazione-dsu-isee" && da === "caf" ? "caf_pilot" : "public_guide";

  return (
    <main className="public-guide-print mx-auto w-full max-w-3xl flex-1 px-4 pb-24 pt-8 sm:px-6 sm:pb-12 print:max-w-none print:p-0">
      <Link href="/guide" className="inline-flex min-h-11 items-center text-sm font-semibold text-brand print:hidden">← Tutte le guide</Link>
      <h1 className="mt-3 text-3xl font-bold tracking-tight text-ink sm:text-4xl">{item.title}</h1>
      <p className="mt-3 leading-7 text-muted">{item.description}</p>
      <PracticalGuide guide={item.guide} checklistEdition={item.versionId} />
      <section aria-labelledby="save-checklist" className="mt-6 rounded-xl border border-line bg-white p-5 sm:p-6 print:hidden">
        <h2 id="save-checklist" className="text-lg font-semibold text-ink">Apri la pratica guidata</h2>
        <p className="mt-2 text-sm leading-6 text-muted">Accedi per rispondere alle domande della pratica e salvare i passaggi nel tuo account. Le spunte di questa pagina restano nel browser.</p>
        <Link href={`/pratiche/${item.slug}?da=${entryPoint}`} prefetch={false} className="mt-4 inline-flex min-h-11 items-center rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark">
          Continua con la checklist
        </Link>
      </section>
    </main>
  );
}
