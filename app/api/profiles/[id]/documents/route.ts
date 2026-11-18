import type { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { readNextDocumentPage } from "@/lib/dashboard/documents";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Non autenticato." }, { status: 401 });
  }
  const cursor = request.nextUrl.searchParams.get("cursor");
  if (!cursor || cursor.length > 200) {
    return Response.json({ error: "Pagina documenti non valida." }, { status: 400 });
  }
  const { id } = await params;
  const page = await readNextDocumentPage(session.user.id, id, cursor);
  return Response.json(page, { headers: { "Cache-Control": "private, no-store" } });
}
