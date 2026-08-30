import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autenticato." }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json() as { profileId?: unknown };
  const profileId = typeof body.profileId === "string" ? body.profileId.trim() : "";
  if (!profileId) {
    return NextResponse.json({ error: "Profilo non valido." }, { status: 400 });
  }

  const [document, profile] = await Promise.all([
    prisma.document.findUnique({ where: { id }, select: { userId: true, profileId: true } }),
    prisma.analysisProfile.findFirst({
      where: { id: profileId, userId: session.user.id },
      select: { id: true },
    }),
  ]);

  if (!document) {
    return NextResponse.json({ error: "Documento non trovato." }, { status: 404 });
  }
  if (document.userId !== session.user.id) {
    return NextResponse.json({ error: "Accesso negato." }, { status: 403 });
  }
  if (!profile) {
    return NextResponse.json({ error: "Profilo non trovato o non appartenente al tuo account." }, { status: 404 });
  }

  if (document.profileId !== profile.id) {
    await prisma.document.update({
      where: { id },
      data: { profileId: profile.id },
    });
  }

  return NextResponse.json({ ok: true, profileId: profile.id });
}
