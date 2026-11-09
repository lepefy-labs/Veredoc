import { NextResponse } from "next/server";
import { apiError, apiUser, smallJson } from "@/lib/pratiche/api";
import { adminSnapshot, isPracticeReviewer, publishProcedure, retireVersion, reviewSource } from "@/lib/pratiche/admin";

export async function GET() {
  const user = await apiUser();
  if (user instanceof NextResponse) return user;
  if (!isPracticeReviewer(user.userId)) return NextResponse.json({ error: "Non autorizzato." }, { status: 403 });
  try {
    return NextResponse.json(await adminSnapshot(), { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return apiError(error); }
}

export async function POST(request: Request) {
  const user = await apiUser();
  if (user instanceof NextResponse) return user;
  if (!isPracticeReviewer(user.userId)) return NextResponse.json({ error: "Non autorizzato." }, { status: 403 });
  try {
    const body = await smallJson(request);
    if (body.action === "verifySource" && typeof body.sourceId === "string" && typeof body.revisionId === "string") await reviewSource(user.userId, body.sourceId, body.revisionId);
    else if (body.action === "publish" && typeof body.versionId === "string") await publishProcedure(user.userId, body.versionId);
    else if (body.action === "retire" && typeof body.versionId === "string") await retireVersion(user.userId, body.versionId);
    else return NextResponse.json({ error: "Operazione non valida." }, { status: 400 });
    return NextResponse.json({ ok: true });
  } catch (error) { return apiError(error); }
}
