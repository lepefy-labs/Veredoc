import { NextRequest, NextResponse } from "next/server";
import { ProfileKind } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const PROFILE_KINDS = new Set<string>(Object.values(ProfileKind));

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autenticato." }, { status: 401 });
  }

  const profiles = await prisma.analysisProfile.findMany({
    where: { userId: session.user.id },
    orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
    select: { id: true, label: true, kind: true, isDefault: true },
  });

  return NextResponse.json({ profiles });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autenticato." }, { status: 401 });
  }

  const body = await req.json() as { label?: unknown; kind?: unknown };
  const label = typeof body.label === "string" ? body.label.trim() : "";
  const kind = typeof body.kind === "string" && PROFILE_KINDS.has(body.kind)
    ? body.kind as ProfileKind
    : ProfileKind.PERSON;

  if (!label || label.length > 60) {
    return NextResponse.json({ error: "Inserisci un nome profilo valido (massimo 60 caratteri)." }, { status: 400 });
  }

  const profile = await prisma.analysisProfile.create({
    data: {
      userId: session.user.id,
      label,
      kind,
      isDefault: false,
    },
    select: { id: true, label: true, kind: true, isDefault: true },
  });

  return NextResponse.json({ profile }, { status: 201 });
}
