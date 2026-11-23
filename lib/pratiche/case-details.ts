import "server-only";
import { logOperationalEvent } from "@/lib/observability/operations";
import { applicableDsuDocumentSteps, DSU_PROCEDURE_SLUG } from "./dsu-preparation";
import { linkedDocumentRequirements } from "./evidence";
import { caseEvidenceEnabled } from "./evidence-availability";
import { caseView, type readCase } from "./service";

export async function caseDetailsView(userId: string, record: NonNullable<Awaited<ReturnType<typeof readCase>>>, evidenceEnabled?: boolean) {
  const view = caseView(record);
  if (view.procedure.slug !== DSU_PROCEDURE_SLUG) return view;

  let dsuLinkedSteps: string[] | null = null;
  if (view.profileId) {
    try {
      if (evidenceEnabled ?? await caseEvidenceEnabled(userId)) {
        dsuLinkedSteps = await linkedDocumentRequirements(userId, view.id, view.profileId, applicableDsuDocumentSteps(view.workflow, view.answers));
      }
    } catch {
      logOperationalEvent("pratiche.dsu_document_summary_unavailable", {}, "warn");
    }
  }
  return { ...view, dsuLinkedSteps };
}
