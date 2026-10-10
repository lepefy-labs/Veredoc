// PATCH /api/profiles/[id] — rinomina un profilo dell'utente.
// DELETE /api/profiles/[id] — elimina un profilo non default e senza documenti attivi.
// I documenti già eliminati (righe anonime) vengono spostati sul profilo default:
// eliminare un profilo non cancella mai documenti.

import { NextRequest, NextResponse } from "next/server";
import { AnalysisStatus } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { validateProfileLabel } from "@/lib/profiles/validation";

async function ownedProfile(userId: string, id: string) {
  return prisma.analysisProfile.findFirst({
    where: { id, userId },
    select: { id: true, isDefault: true },
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autenticato." }, { status: 401 });
  }

  const { id } = await params;
  const profile = await ownedProfile(session.user.id, id);
  if (!profile) {
    return NextResponse.json({ error: "Profilo non trovato." }, { status: 404 });
  }

  const body = await req.json().catch(() => ({})) as { label?: unknown };
  const label = validateProfileLabel(body.label);
  if (!label) {
    return NextResponse.json({ error: "Inserisci un nome profilo valido (massimo 60 caratteri)." }, { status: 400 });
  }

  const updated = await prisma.analysisProfile.update({
    where: { id: profile.id },
    data: { label },
    select: { id: true, label: true, kind: true, isDefault: true },
  });
  return NextResponse.json({ profile: updated });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autenticato." }, { status: 401 });
  }
  const userId = session.user.id;

  const { id } = await params;
  const profile = await ownedProfile(userId, id);
  if (!profile) {
    return NextResponse.json({ error: "Profilo non trovato." }, { status: 404 });
  }
  if (profile.isDefault) {
    return NextResponse.json({ error: "Il profilo principale non può essere eliminato." }, { status: 409 });
  }

  let result: { ok: true } | { ok: false; active: number };
  try {
    result = await prisma.$transaction(async (tx) => {
    const active = await tx.document.count({
      where: { profileId: profile.id, status: { not: AnalysisStatus.DELETED } },
    });
    if (active > 0) return { ok: false as const, active };

    const fallback = await tx.analysisProfile.findFirst({
      where: { userId, isDefault: true },
      select: { id: true },
    });
    if (!fallback) return { ok: false as const, active: 0 };

    await tx.document.updateMany({
      where: { profileId: profile.id, status: AnalysisStatus.DELETED },
      data: { profileId: fallback.id },
    });
    await tx.analysisProfile.delete({ where: { id: profile.id } });
    return { ok: true as const };
    });
  } catch {
    // Es. documento caricato nel profilo durante l'eliminazione (vincolo RESTRICT).
    result = { ok: false, active: 1 };
  }

  if (!result.ok) {
    return NextResponse.json({
      error: result.active > 0
        ? "Il profilo contiene documenti: spostali in un altro profilo o eliminali prima di eliminare il profilo."
        : "Impossibile eliminare il profilo.",
    }, { status: 409 });
  }
  return NextResponse.json({ success: true });
}
