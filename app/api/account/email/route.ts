// POST /api/account/email — richiesta di cambio email { newEmail, password }.
// Il nuovo indirizzo diventa effettivo solo dopo la conferma dal link inviato a quell'indirizzo;
// il vecchio indirizzo riceve un avviso. La risposta non rivela se il nuovo indirizzo è già usato.

import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isValidEmail, normalizeEmail } from "@/lib/account/credentials";
import { findUserIdByEmail } from "@/lib/account/users";
import { isLifecycleAvailable, getAccountSessionState } from "@/lib/account/state";
import { issueEmailToken } from "@/lib/account/tokens";
import { accountMailer } from "@/lib/account/mailer";
import { isEmailProviderConfigured } from "@/lib/notifications/config";
import { RATE_LIMITS } from "@/lib/security/rate-limit";
import { enforceRateLimits } from "@/lib/security/rate-limit-server";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Non autenticato." }, { status: 401 });

  const body = await req.json().catch(() => ({})) as { newEmail?: unknown; password?: unknown };
  const newEmail = normalizeEmail(body.newEmail);
  if (!isValidEmail(newEmail)) return NextResponse.json({ error: "Inserisci un indirizzo email valido." }, { status: 400 });
  if (typeof body.password !== "string" || !body.password) {
    return NextResponse.json({ error: "Inserisci la password attuale." }, { status: 400 });
  }

  const state = await getAccountSessionState(session.user.id);
  if (!state || !isLifecycleAvailable() || state.emailStatus === "unknown" || !isEmailProviderConfigured()) {
    return NextResponse.json({ error: "Il cambio email non è ancora disponibile." }, { status: 503 });
  }
  if (normalizeEmail(state.email) === newEmail) {
    return NextResponse.json({ error: "Questo è già l'indirizzo del tuo account." }, { status: 400 });
  }

  const limit = await enforceRateLimits("email_change", [{ rule: RATE_LIMITS.emailChangeUser, subject: session.user.id }]);
  if (!limit.allowed) return NextResponse.json({ error: "Troppi tentativi. Riprova tra qualche minuto." }, { status: 429 });

  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { password: true } });
  if (!user || !await bcrypt.compare(body.password, user.password)) {
    return NextResponse.json({ error: "La password non è corretta." }, { status: 400 });
  }

  // Indirizzo già usato da un altro account: nessun invio, stessa risposta.
  if (!await findUserIdByEmail(newEmail)) {
    const token = await issueEmailToken(session.user.id, "CHANGE_EMAIL", newEmail);
    await accountMailer.changeConfirm(newEmail, token);
    await accountMailer.changeNotice(state.email);
  }
  return NextResponse.json({ success: true });
}
