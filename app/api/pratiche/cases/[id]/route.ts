import { NextResponse } from "next/server";
import { apiError, apiUser, smallJson } from "@/lib/pratiche/api";
import { caseView, readCase, updateCase } from "@/lib/pratiche/service";
import { prisma } from "@/lib/prisma";

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: Context) {
  const user = await apiUser();
  if (user instanceof NextResponse) return user;
  try {
    const { id } = await context.params;
    const record = await readCase(user.userId, id);
    if (!record) return NextResponse.json({ error: "Pratica non trovata." }, { status: 404 });
    return NextResponse.json({ case: caseView(record) }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return apiError(error); }
}

export async function PATCH(request: Request, context: Context) {
  const user = await apiUser();
  if (user instanceof NextResponse) return user;
  try {
    const { id } = await context.params;
    const body = await smallJson(request);
    if (typeof body.expectedRevision !== "number" || !Number.isSafeInteger(body.expectedRevision)) return NextResponse.json({ error: "Versione non valida." }, { status: 400 });
    let mutation;
    if (body.kind === "answer" && typeof body.questionId === "string") mutation = { kind: "answer" as const, questionId: body.questionId, value: body.value };
    else if (body.kind === "step" && typeof body.stepId === "string" && typeof body.done === "boolean") mutation = { kind: "step" as const, stepId: body.stepId, done: body.done };
    else if (body.kind === "status" && ["USER_REPORTED_SUBMITTED", "COMPLETED", "CANCELLED"].includes(String(body.status))) mutation = { kind: "status" as const, status: body.status as "USER_REPORTED_SUBMITTED" | "COMPLETED" | "CANCELLED" };
    else return NextResponse.json({ error: "Operazione non valida." }, { status: 400 });
    await updateCase(user.userId, id, body.expectedRevision, mutation);
    const record = await readCase(user.userId, id);
    return NextResponse.json({ case: record ? caseView(record) : null }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return apiError(error); }
}

export async function DELETE(_request: Request, context: Context) {
  const user = await apiUser();
  if (user instanceof NextResponse) return user;
  try {
    const { id } = await context.params;
    const deleted = await prisma.userCase.deleteMany({ where: { id, userId: user.userId } });
    return deleted.count ? new NextResponse(null, { status: 204 }) : NextResponse.json({ error: "Pratica non trovata." }, { status: 404 });
  } catch (error) { return apiError(error); }
}
