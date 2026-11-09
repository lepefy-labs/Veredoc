import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { praticheEnabled, praticheSchemaReady, PracticeError } from "./service";

export async function apiUser(): Promise<{ userId: string } | NextResponse> {
  if (!praticheEnabled()) return NextResponse.json({ error: "Modulo non disponibile." }, { status: 503 });
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Non autenticato." }, { status: 401 });
  if (!await praticheSchemaReady()) return NextResponse.json({ error: "Modulo in preparazione." }, { status: 503 });
  return { userId: session.user.id };
}

export function apiError(error: unknown): NextResponse {
  if (error instanceof PracticeError) return NextResponse.json({ error: error.message }, { status: error.status });
  return NextResponse.json({ error: "Errore temporaneo. Riprova." }, { status: 500 });
}

export async function smallJson(request: Request): Promise<Record<string, unknown>> {
  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > 8192) throw new PracticeError("Richiesta troppo grande.", 413);
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object" || Array.isArray(body)) throw new PracticeError("Richiesta non valida.", 400);
  return body as Record<string, unknown>;
}
