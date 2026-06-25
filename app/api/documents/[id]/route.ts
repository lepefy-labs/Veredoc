import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AnalysisStatus, Prisma } from "@prisma/client";
import { createClient } from "@supabase/supabase-js";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

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

export async function DELETE(
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
  if (document.status === AnalysisStatus.DELETED) {
    return NextResponse.json({ error: "Documento già eliminato." }, { status: 400 });
  }

  // Rimuovi file fisico da Supabase Storage (non bloccare su errore)
  if (document.filePath) {
    const supabase = getSupabase();
    await supabase.storage.from("documents").remove([document.filePath]);
  }

  // Soft delete: azzera i dati sensibili, conserva i metadati per analytics
  await prisma.document.update({
    where: { id },
    data: {
      status: AnalysisStatus.DELETED,
      deletedAt: new Date(),
      fileName: "documento_eliminato",
      filePath: null,
      analysis: Prisma.DbNull,
      rawExtracted: Prisma.DbNull,
      anonymizedText: null,
      anonymizedMap: Prisma.DbNull,
    },
  });

  return NextResponse.json({ success: true });
}
