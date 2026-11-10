import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { catalog, praticheEnabled, praticheSchemaReady } from "@/lib/pratiche/service";
import StartPractice from "@/components/pratiche/StartPractice";
import PreparationList from "@/components/pratiche/PreparationList";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";

export default async function ProcedurePage({ params }: { params: Promise<{ slug: string }> }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  if (!praticheEnabled() || !await praticheSchemaReady()) notFound();
  const { slug } = await params;
  const item = (await catalog()).find((candidate) => candidate.slug === slug);
  if (!item) notFound();
  const profiles = item.available ? await prisma.analysisProfile.findMany({ where: { userId: session.user.id }, select: { id: true, label: true, kind: true }, orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }] }) : [];
  return <main className="mx-auto w-full max-w-3xl px-4 pb-28 pt-8 sm:pb-12">
    <Link href="/pratiche" className="text-sm font-semibold text-brand">← Tutte le pratiche</Link>
    <p className="mt-6 text-sm font-semibold text-brand">{item.category}</p><h1 className="mt-1 text-3xl font-bold">{item.title}</h1>
    <p className="mt-3 text-muted">{item.description}</p>
    <div className="mt-6 rounded-xl border border-line bg-white p-5"><h2 className="font-semibold">Per chi è questa guida</h2><p className="mt-2 text-sm text-muted">{item.audience}</p><h2 className="mt-4 font-semibold">Chi gestisce la richiesta</h2><p className="mt-2 text-sm text-muted">{item.authority}</p><p className="mt-3 text-xs text-muted">Dove vale: {item.scope}</p></div>
    {item.available && item.workflow ? <>
      {item.preparation && <div className="mt-5"><PreparationList preparation={item.preparation} /></div>}
      <div className="mt-5 rounded-xl border border-line bg-white p-5"><h2 className="font-semibold">Da dove vengono queste informazioni</h2><ul className="mt-3 space-y-3 text-sm">{item.sources.map((source) => <li key={source.url}><a href={source.url} target="_blank" rel="noopener noreferrer" className="font-medium text-brand underline">{source.title}</a><p className="text-xs text-muted">{source.authority}. Controllata il {source.verifiedAt?.toLocaleDateString("it-IT")}. {source.scope}.</p></li>)}</ul></div>
      <div className="mt-6"><StartPractice slug={slug} profiles={profiles} /></div>
    </> : <div className="mt-6 rounded-xl border border-line bg-white p-5"><p className="font-semibold">Guida non ancora disponibile</p><p className="mt-2 text-sm text-muted">Stiamo controllando le informazioni di questa guida. Per ora non puoi iniziarla.</p></div>}
  </main>;
}
