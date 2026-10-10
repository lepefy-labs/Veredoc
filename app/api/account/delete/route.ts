// POST /api/account/delete — eliminazione definitiva dell'account { password, confirmation: "ELIMINA" }.
// Ordine: file in Storage (se fallisce, nulla viene cancellato dal DB e si può riprovare),
// poi documenti e account in un'unica transazione; profili, token, consensi, stato e
// notifiche vengono rimossi in cascata. Le sessioni decadono: l'utente non esiste più.

import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { createClient } from "@supabase/supabase-js";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { accountMailer } from "@/lib/account/mailer";
import { DELETE_CONFIRMATION } from "@/lib/account/credentials";
import { RATE_LIMITS } from "@/lib/security/rate-limit";
import { enforceRateLimits } from "@/lib/security/rate-limit-server";
import { logOperationalEvent, toSafeErrorMessage } from "@/lib/observability/operations";


export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Non autenticato." }, { status: 401 });
  const userId = session.user.id;

  const body = await req.json().catch(() => ({})) as { password?: unknown; confirmation?: unknown };
  if (body.confirmation !== DELETE_CONFIRMATION) {
    return NextResponse.json({ error: `Scrivi ${DELETE_CONFIRMATION} per confermare.` }, { status: 400 });
  }
  if (typeof body.password !== "string" || !body.password) {
    return NextResponse.json({ error: "Inserisci la password." }, { status: 400 });
  }

  const limit = await enforceRateLimits("account_delete", [{ rule: RATE_LIMITS.deleteUser, subject: userId }]);
  if (!limit.allowed) return NextResponse.json({ error: "Troppi tentativi. Riprova tra qualche minuto." }, { status: 429 });

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true, password: true } });
  if (!user) return NextResponse.json({ error: "Non autenticato." }, { status: 401 });
  if (!await bcrypt.compare(body.password, user.password)) {
    return NextResponse.json({ error: "La password non è corretta." }, { status: 400 });
  }

  // 1. File originali: quelli referenziati dai documenti e qualsiasi residuo nella cartella dell'utente.
  try {
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
    const bucket = supabase.storage.from("documents");
    const documents = await prisma.document.findMany({ where: { userId, filePath: { not: null } }, select: { filePath: true } });
    const paths = new Set(documents.map((document) => document.filePath!));
    const folder = `uploads/${userId}`;
    for (let offset = 0; ; offset += 1000) {
      const { data, error } = await bucket.list(folder, { limit: 1000, offset });
      if (error) throw new Error(`list: ${error.message}`);
      for (const entry of data ?? []) paths.add(`${folder}/${entry.name}`);
      if (!data || data.length < 1000) break;
    }
    const all = [...paths];
    for (let index = 0; index < all.length; index += 100) {
      const { error } = await bucket.remove(all.slice(index, index + 100));
      if (error) throw new Error(`remove: ${error.message}`);
    }
  } catch (error) {
    logOperationalEvent("account.delete_storage_failed", { userId, error: toSafeErrorMessage(error, 160) }, "error");
    return NextResponse.json({ error: "Non è stato possibile eliminare i file. Nessun dato è stato cancellato: riprova tra qualche minuto." }, { status: 500 });
  }

  // 2. Database. I documenti vanno eliminati prima dell'utente: Document → AnalysisProfile è RESTRICT.
  await prisma.$transaction([
    prisma.document.deleteMany({ where: { userId } }),
    prisma.user.delete({ where: { id: userId } }),
  ]);

  logOperationalEvent("account.deleted", { userId });
  await accountMailer.accountDeleted(user.email);
  return NextResponse.json({ success: true });
}
