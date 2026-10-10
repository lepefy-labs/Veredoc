// POST /api/account/verify-email
// - { token }: conferma l'indirizzo (verifica o cambio email). Non richiede sessione:
//   il link può essere aperto su un altro dispositivo.
// - senza token, con sessione: reinvia l'email di verifica.

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { consumeEmailToken, issueEmailToken } from "@/lib/account/tokens";
import { getAccountSessionState, isLifecycleAvailable, markEmailVerified } from "@/lib/account/state";
import { applyEmailChangeSql } from "@/lib/account/lifecycle-sql";
import { accountMailer } from "@/lib/account/mailer";
import { isEmailProviderConfigured } from "@/lib/notifications/config";
import { clientIpFrom, RATE_LIMITS } from "@/lib/security/rate-limit";
import { enforceRateLimits } from "@/lib/security/rate-limit-server";
import { logOperationalEvent } from "@/lib/observability/operations";

const INVALID = "Il link non è valido o è scaduto. Richiedine uno nuovo dalla pagina Account.";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({})) as { token?: unknown; type?: unknown };

  if (typeof body.token === "string" && body.token) {
    const limit = await enforceRateLimits("verify_email", [{ rule: RATE_LIMITS.verifyTokenIp, subject: clientIpFrom(req.headers) }]);
    if (!limit.allowed) return NextResponse.json({ error: "Troppi tentativi. Riprova tra un'ora." }, { status: 429 });

    if (body.type === "change") {
      const row = await consumeEmailToken(body.token, "CHANGE_EMAIL").catch(() => null);
      if (!row?.newEmail) return NextResponse.json({ error: INVALID }, { status: 400 });
      const updated = await prisma.$executeRaw(applyEmailChangeSql(row.userId, row.newEmail));
      if (updated === 0) {
        return NextResponse.json({ error: "Questo indirizzo è già usato da un altro account." }, { status: 409 });
      }
      await markEmailVerified(row.userId);
      logOperationalEvent("account.email_changed", { userId: row.userId });
      return NextResponse.json({ success: true, changed: true });
    }

    const row = await consumeEmailToken(body.token, "VERIFY_EMAIL").catch(() => null);
    if (!row) return NextResponse.json({ error: INVALID }, { status: 400 });
    await markEmailVerified(row.userId);
    logOperationalEvent("account.email_verified", { userId: row.userId });
    return NextResponse.json({ success: true, changed: false });
  }

  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Non autenticato." }, { status: 401 });
  if (!isEmailProviderConfigured()) {
    return NextResponse.json({ error: "L'invio delle email non è disponibile in questo momento." }, { status: 503 });
  }

  const state = await getAccountSessionState(session.user.id);
  if (!state || !isLifecycleAvailable() || state.emailStatus === "unknown") {
    return NextResponse.json({ error: "La verifica dell'email non è ancora disponibile." }, { status: 503 });
  }
  if (state.emailStatus === "verified") return NextResponse.json({ success: true, alreadyVerified: true });

  const limit = await enforceRateLimits("verify_email_send", [{ rule: RATE_LIMITS.verifySendUser, subject: session.user.id }]);
  if (!limit.allowed) return NextResponse.json({ error: "Hai già richiesto diverse email. Riprova tra un'ora." }, { status: 429 });

  const token = await issueEmailToken(session.user.id, "VERIFY_EMAIL");
  const sent = await accountMailer.verify(state.email, token);
  if (!sent) return NextResponse.json({ error: "Invio non riuscito. Riprova più tardi." }, { status: 502 });
  return NextResponse.json({ success: true });
}
