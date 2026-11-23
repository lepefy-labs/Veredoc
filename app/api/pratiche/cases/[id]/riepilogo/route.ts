import { NextResponse } from "next/server";
import { apiError, apiUser } from "@/lib/pratiche/api";
import { applies } from "@/lib/pratiche/engine";
import { preparationPdf } from "@/lib/pratiche/preparation-pdf";
import { caseView, readCase } from "@/lib/pratiche/service";
import { PRACTICE_STATUS_LABELS } from "@/lib/pratiche/status";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await apiUser();
  if (user instanceof NextResponse) return user;
  try {
    const { id } = await params;
    const record = await readCase(user.userId, id);
    if (!record) return NextResponse.json({ error: "Pratica non trovata." }, { status: 404 });
    const item = caseView(record);
    const completed = new Set(item.completed);
    const steps = item.workflow.steps
      .filter((step) => step.kind !== "portal" && !item.progress.blocked && applies(step.when, item.answers))
      .map(({ id, title }) => ({ title, done: completed.has(id) }));
    const bytes = await preparationPdf({
      title: item.title,
      status: PRACTICE_STATUS_LABELS[item.status] ?? item.status,
      version: item.version,
      updatedAt: item.updatedAt,
      requiredDone: item.progress.done,
      requiredTotal: item.progress.required,
      steps,
      authorities: [...new Set(item.sources.map(({ authority }) => authority))],
    });
    return new NextResponse(new Uint8Array(bytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'attachment; filename="veredoc-riepilogo-preparazione.pdf"',
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return apiError(error);
  }
}
