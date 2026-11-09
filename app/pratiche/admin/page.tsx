import { auth } from "@/lib/auth";
import { adminSnapshot, isPracticeReviewer } from "@/lib/pratiche/admin";
import { praticheEnabled, praticheSchemaReady } from "@/lib/pratiche/service";
import { notFound } from "next/navigation";
import PracticeAdmin from "@/components/pratiche/PracticeAdmin";

export default async function PracticeAdminPage() {
  const session = await auth();
  if (!session?.user?.id || !isPracticeReviewer(session.user.id) || !praticheEnabled() || !await praticheSchemaReady()) notFound();
  const initial = JSON.parse(JSON.stringify(await adminSnapshot()));
  return <main className="mx-auto w-full max-w-5xl px-4 py-8"><h1 className="text-2xl font-bold">Revisione Pratiche</h1><p className="mt-2 text-sm text-muted">Confronta ogni istruzione con la fonte originale prima di verificare e pubblicare.</p><PracticeAdmin initial={initial} /></main>;
}
