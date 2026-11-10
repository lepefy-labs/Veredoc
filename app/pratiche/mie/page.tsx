import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { praticheEnabled, praticheSchemaReady } from "@/lib/pratiche/service";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { plainTitle } from "@/lib/pratiche/plain-language";

const labels: Record<string, string> = { DRAFT: "Da iniziare", IN_PROGRESS: "In corso", BLOCKED: "Serve aiuto", READY_TO_SUBMIT: "Pronte da inviare", USER_REPORTED_SUBMITTED: "Invio segnato da te", COMPLETED: "Concluse", CANCELLED: "Annullate" };

export default async function MyPracticesPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  if (!praticheEnabled() || !await praticheSchemaReady()) notFound();
  const cases = await prisma.userCase.findMany({ where: { userId: session.user.id }, orderBy: { updatedAt: "desc" }, select: { id: true, title: true, procedureVersionId: true, status: true, updatedAt: true } });
  return <main className="mx-auto w-full max-w-4xl px-4 pb-28 pt-8 sm:pb-12"><div className="flex items-center justify-between gap-4"><div><p className="text-sm font-semibold text-brand">Veredoc Pratiche</p><h1 className="mt-1 text-3xl font-bold">Le mie pratiche</h1></div><Link href="/pratiche" className="rounded-lg bg-brand px-4 py-3 text-sm font-semibold text-white">Nuova pratica</Link></div>
    {cases.length === 0 ? <div className="mt-8 rounded-xl border border-line bg-white p-6"><p>Non hai ancora avviato pratiche.</p></div> : Object.entries(labels).map(([status, label]) => {
      const group = cases.filter((item) => item.status === status);
      return group.length ? <section key={status} className="mt-8"><h2 className="text-lg font-bold">{label}</h2><div className="mt-3 space-y-3">{group.map((item) => <Link href={`/pratiche/caso/${item.id}`} key={item.id} className="block rounded-xl border border-line bg-white p-5 hover:border-brand"><p className="font-semibold">{plainTitle(item.procedureVersionId, item.title)}</p><p className="mt-1 text-xs text-muted">Aggiornata il {item.updatedAt.toLocaleDateString("it-IT")}</p></Link>)}</div></section> : null;
    })}
  </main>;
}
