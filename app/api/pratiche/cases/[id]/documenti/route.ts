import { NextResponse } from "next/server";
import { apiError, apiUser, smallJson } from "@/lib/pratiche/api";
import { caseEvidenceEnabled } from "@/lib/pratiche/evidence-availability";
import { changeEvidence, readEvidence } from "@/lib/pratiche/evidence";

type Context = { params: Promise<{ id: string }> };
const stepPattern = /^[a-z][a-z0-9_]{1,63}$/;
const noStore = { "Cache-Control": "no-store" };

export async function GET(request: Request, { params }: Context) {
  const user = await apiUser();
  if (user instanceof NextResponse) return user;
  try {
    if (!await caseEvidenceEnabled(user.userId)) return NextResponse.json({ error: "Fascicolo non disponibile." }, { status: 404 });
    const { id } = await params;
    const search = new URL(request.url).searchParams;
    const step = search.get("step") ?? "";
    const offset = Number(search.get("offset") ?? 0);
    if (!stepPattern.test(step) || !Number.isInteger(offset) || offset < 0 || offset > 20_000) {
      return NextResponse.json({ error: "Richiesta non valida." }, { status: 400 });
    }
    return NextResponse.json(await readEvidence(user.userId, id, step, offset), { headers: noStore });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: Request, { params }: Context) {
  const user = await apiUser();
  if (user instanceof NextResponse) return user;
  try {
    if (!await caseEvidenceEnabled(user.userId)) return NextResponse.json({ error: "Fascicolo non disponibile." }, { status: 404 });
    const { id } = await params;
    const { step, documentId, action } = await smallJson(request);
    if (typeof step !== "string" || !stepPattern.test(step) || typeof documentId !== "string" ||
        !documentId || documentId.length > 128 || (action !== "link" && action !== "unlink")) {
      return NextResponse.json({ error: "Richiesta non valida." }, { status: 400 });
    }
    await changeEvidence(user.userId, id, step, documentId, action);
    return NextResponse.json({ ok: true }, { headers: noStore });
  } catch (error) {
    return apiError(error);
  }
}
