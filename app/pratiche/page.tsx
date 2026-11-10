import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { catalog, praticheEnabled, praticheSchemaReady } from "@/lib/pratiche/service";
import Catalog from "@/components/pratiche/Catalog";
import Link from "next/link";

export default async function PratichePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?next=%2Fpratiche");
  const ready = praticheEnabled() && await praticheSchemaReady();
  return <main className="mx-auto w-full max-w-5xl px-4 pb-28 pt-8 sm:pb-12">
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div><p className="text-sm font-semibold text-brand">Veredoc Pratiche</p><h1 className="mt-1 text-3xl font-bold">Cosa devi fare?</h1><p className="mt-2 text-muted">Scegli una guida. Ti aiutiamo a capire cosa serve e quali passaggi fare.</p></div>
      {ready && <Link href="/pratiche/mie" className="rounded-lg border border-line bg-white px-4 py-3 text-sm font-semibold">Le mie pratiche</Link>}
    </div>
    {ready ? <Catalog items={(await catalog()).map(({ slug, title, description, category, authority, available }) => ({ slug, title, description, category, authority, available }))} /> : <div className="rounded-xl border border-line bg-white p-6"><p>Le guide non sono disponibili in questo momento.</p></div>}
  </main>;
}
