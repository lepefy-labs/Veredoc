import { randomUUID } from "node:crypto";
import { logOperationalEvent } from "@/lib/observability/operations";
import { auth } from "@/lib/auth";
import { notFound, redirect } from "next/navigation";
import { caseDetailsView } from "@/lib/pratiche/case-details";
import { praticheEnabled, praticheSchemaReady, readCase } from "@/lib/pratiche/service";
import { caseEvidenceEnabled } from "@/lib/pratiche/evidence-availability";
import CaseWizard from "@/components/pratiche/CaseWizard";

export default async function CasePage({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ from?: string | string[] }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  if (!praticheEnabled() || !await praticheSchemaReady()) notFound();
  const { id } = await params;
  const record = await readCase(session.user.id, id);
  if (!record) notFound();
  const fromDashboard = (await searchParams).from === "dashboard";
  const resumeVisit = fromDashboard ? randomUUID() : undefined;
  if (resumeVisit) logOperationalEvent("pratiche.dashboard_resumed", { resumeVisit });
  const evidenceEnabled = await caseEvidenceEnabled(session.user.id);
  const initial = await caseDetailsView(session.user.id, record, evidenceEnabled);
  return <main className="w-full"><CaseWizard initial={initial} resumeVisit={resumeVisit} evidenceEnabled={evidenceEnabled} /></main>;
}
