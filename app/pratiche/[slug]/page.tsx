import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { catalog, praticheEnabled, praticheSchemaReady } from "@/lib/pratiche/service";
import StartPractice from "@/components/pratiche/StartPractice";
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
    <div className="mt-6 rounded-xl border border-line bg-white p-5"><h2 className="font-semibold">A chi si rivolge</h2><p className="mt-2 text-sm text-muted">{item.audience}</p><h2 className="mt-4 font-semibold">Ente competente</h2><p className="mt-2 text-sm text-muted">{item.authority}</p><p className="mt-3 text-xs text-muted">Ambito: {item.scope}</p></div>
    {item.available && item.workflow ? <>
      <div className="mt-5 rounded-xl border border-line bg-white p-5"><h2 className="font-semibold">Cosa preparare</h2><ul className="mt-3 list-disc space-y-2 pl-5 text-sm">{item.workflow.steps.filter((step) => step.kind === "document").map((step) => <li key={step.id}>{step.title}</li>)}</ul><p className="mt-4 text-xs text-muted">La checklist si adatta alle tue risposte.</p></div>
      <div className="mt-5 rounded-xl border border-line bg-white p-5"><h2 className="font-semibold">Fonti ufficiali</h2><ul className="mt-3 space-y-3 text-sm">{item.sources.map((source) => <li key={source.url}><a href={source.url} target="_blank" rel="noopener noreferrer" className="font-medium text-brand underline">{source.title}</a><p className="text-xs text-muted">{source.authority}, verifica {source.verifiedAt?.toLocaleDateString("it-IT")}, revisione {source.revision}, {source.scope}</p></li>)}</ul></div>
      <div className="mt-6"><StartPractice slug={slug} profiles={profiles} /></div>
    </> : <div className="mt-6 rounded-xl border border-line bg-white p-5"><p className="font-semibold">Procedura in preparazione</p><p className="mt-2 text-sm text-muted">Le fonti e le istruzioni devono ancora essere approvate. Non puoi avviare una pratica con questa versione.</p></div>}
  </main>;
}
