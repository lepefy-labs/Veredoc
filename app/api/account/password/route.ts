// POST /api/account/password — cambio password dell'utente autenticato.
// Richiede la password attuale; invalida i link di reset ancora attivi.

import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PASSWORD_PROBLEM_MESSAGES, passwordProblem } from "@/lib/account/credentials";
import { RATE_LIMITS } from "@/lib/security/rate-limit";
import { enforceRateLimits } from "@/lib/security/rate-limit-server";
import { logOperationalEvent } from "@/lib/observability/operations";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autenticato." }, { status: 401 });
  }

  const body = await req.json().catch(() => ({})) as { currentPassword?: unknown; newPassword?: unknown };
  if (typeof body.currentPassword !== "string" || !body.currentPassword) {
    return NextResponse.json({ error: "Inserisci la password attuale." }, { status: 400 });
  }
  const problem = passwordProblem(body.newPassword);
  if (problem) {
    return NextResponse.json({ error: PASSWORD_PROBLEM_MESSAGES[problem] }, { status: 400 });
  }
  if (body.newPassword === body.currentPassword) {
    return NextResponse.json({ error: "La nuova password deve essere diversa da quella attuale." }, { status: 400 });
  }

  const limit = await enforceRateLimits("password_change", [
    { rule: RATE_LIMITS.passwordChangeUser, subject: session.user.id },
  ]);
  if (!limit.allowed) {
    return NextResponse.json({ error: "Troppi tentativi. Riprova tra qualche minuto." }, { status: 429 });
  }

  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { id: true, password: true } });
  if (!user) {
    return NextResponse.json({ error: "Non autenticato." }, { status: 401 });
  }
  if (!await bcrypt.compare(body.currentPassword, user.password)) {
    return NextResponse.json({ error: "La password attuale non è corretta." }, { status: 400 });
  }

  const hashed = await bcrypt.hash(body.newPassword as string, 12);
  const now = new Date();
  await prisma.$transaction([
    prisma.user.update({ where: { id: user.id }, data: { password: hashed } }),
    prisma.passwordResetToken.updateMany({ where: { userId: user.id, usedAt: null }, data: { usedAt: now } }),
  ]);

  logOperationalEvent("account.password_changed", { userId: user.id });
  return NextResponse.json({ success: true });
}
