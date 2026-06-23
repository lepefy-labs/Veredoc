import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autenticato." }, { status: 401 });
  }

  const { id } = await params;
  const document = await prisma.document.findUnique({ where: { id } });

  if (!document) {
    return NextResponse.json({ error: "Documento non trovato." }, { status: 404 });
  }

  if (document.userId !== session.user.id) {
    return NextResponse.json({ error: "Non autorizzato." }, { status: 403 });
  }

  return NextResponse.json(document);
}
