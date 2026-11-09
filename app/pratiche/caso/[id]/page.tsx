import { auth } from "@/lib/auth";
import { notFound, redirect } from "next/navigation";
import { caseView, praticheEnabled, praticheSchemaReady, readCase } from "@/lib/pratiche/service";
import CaseWizard from "@/components/pratiche/CaseWizard";

export default async function CasePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  if (!praticheEnabled() || !await praticheSchemaReady()) notFound();
  const { id } = await params;
  const record = await readCase(session.user.id, id);
  if (!record) notFound();
  return <main className="w-full"><CaseWizard initial={caseView(record)} /></main>;
}
