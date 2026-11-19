import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { practiceEntryPoint } from "@/lib/pratiche/entry-point";
import { prisma } from "@/lib/prisma";
import { catalog, praticheEnabled, praticheSchemaReady } from "@/lib/pratiche/service";
import StartPractice from "@/components/pratiche/StartPractice";
import PreparationList from "@/components/pratiche/PreparationList";
import PracticalGuide from "@/components/pratiche/PracticalGuide";
import { practicalGuide } from "@/lib/pratiche/guide-content";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function ProcedurePage({ params, searchParams }: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ da?: string | string[] }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  if (!praticheEnabled() || !await praticheSchemaReady()) notFound();
  const [{ slug }, { da }] = await Promise.all([params, searchParams]);
  const entryPoint = practiceEntryPoint(da, slug);
  const item = (await catalog()).find((candidate) => candidate.slug === slug);
  if (!item) notFound();
  const guide = item.available ? practicalGuide(item.versionId) : undefined;
  const profiles = item.available ? await prisma.analysisProfile.findMany({ where: { userId: session.user.id }, select: { id: true, label: true, kind: true }, orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }] }) : [];
  return <main className="mx-auto w-full max-w-3xl px-4 pb-28 pt-8 sm:pb-12">
    <Link href="/pratiche" className="text-sm font-semibold text-brand">← Tutte le pratiche</Link>
    <p className="mt-6 text-sm font-semibold text-brand">{item.category}</p><h1 className="mt-1 text-3xl font-bold">{item.title}</h1>
    <p className="mt-3 text-muted">{item.description}</p>
    {item.available && item.workflow ? <>
      {guide
        ? <PracticalGuide guide={guide} />
        : item.preparation && <div className="mt-5"><PreparationList preparation={item.preparation} /></div>}
      <section aria-labelledby="guide-checklist" className="mt-6 rounded-xl border border-line bg-white p-5">
        <h2 id="guide-checklist" className="text-lg font-semibold">Checklist di Veredoc</h2>
        <p className="mt-1 text-sm text-muted">Tieni traccia di ciò che hai preparato e dei passaggi che hai completato.</p>
        <div className="mt-4"><StartPractice slug={slug} profiles={profiles} entryPoint={entryPoint} /></div>
      </section>
      <details className="mt-6 rounded-xl border border-line bg-white p-5">
        <summary className="cursor-pointer font-semibold text-brand">Informazioni e fonti ufficiali</summary>
        <div className="mt-4 space-y-2 text-sm text-muted"><p>{item.audience}</p><p>Chi gestisce la richiesta: {item.authority}</p><p>{item.scope}</p></div>
        <ul className="mt-4 space-y-3 text-sm">{item.sources.map((source) => <li key={source.url}><a href={source.url} target="_blank" rel="noopener noreferrer" className="font-medium text-brand underline">{source.title}</a><p className="text-xs text-muted">{source.authority}. Controllata il {source.verifiedAt?.toLocaleDateString("it-IT")}.</p></li>)}</ul>
      </details>
    </> : <div className="mt-6 rounded-xl border border-line bg-white p-5"><p className="font-semibold">Guida non ancora disponibile</p><p className="mt-2 text-sm text-muted">Stiamo controllando le informazioni di questa guida. Per ora non puoi iniziarla.</p></div>}
  </main>;
}
