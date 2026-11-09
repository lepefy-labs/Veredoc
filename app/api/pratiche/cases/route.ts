import { NextResponse } from "next/server";
import { apiError, apiUser, smallJson } from "@/lib/pratiche/api";
import { prisma } from "@/lib/prisma";
import { startCase } from "@/lib/pratiche/service";

export async function GET() {
  const user = await apiUser();
  if (user instanceof NextResponse) return user;
  try {
    const cases = await prisma.userCase.findMany({ where: { userId: user.userId }, orderBy: { updatedAt: "desc" }, select: { id: true, title: true, status: true, updatedAt: true, profileId: true, revision: true } });
    return NextResponse.json({ cases }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return apiError(error); }
}

export async function POST(request: Request) {
  const user = await apiUser();
  if (user instanceof NextResponse) return user;
  try {
    const body = await smallJson(request);
    if (typeof body.slug !== "string" || !/^[a-z0-9-]{2,80}$/.test(body.slug) || typeof body.profileId !== "string" || body.profileId.length > 100) return NextResponse.json({ error: "Dati non validi." }, { status: 400 });
    const key = request.headers.get("idempotency-key") ?? "";
    if (key && !/^[a-zA-Z0-9_-]{8,100}$/.test(key)) return NextResponse.json({ error: "Chiave non valida." }, { status: 400 });
    const created = await startCase(user.userId, body.slug, body.profileId, key);
    return NextResponse.json({ id: created.id }, { status: 201 });
  } catch (error) { return apiError(error); }
}
