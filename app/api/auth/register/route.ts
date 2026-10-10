import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";
import { ProfileKind } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { findUserIdByEmail } from "@/lib/account/users";
import { ensureAccountState } from "@/lib/account/state";
import { issueEmailToken } from "@/lib/account/tokens";
import { accountMailer } from "@/lib/account/mailer";
import {
  LEGAL_DOCUMENTS_VERSION,
  PASSWORD_PROBLEM_MESSAGES,
  isValidEmail,
  normalizeEmail,
  passwordProblem,
} from "@/lib/account/credentials";
import { clientIpFrom, isMissingTableError, RATE_LIMITS } from "@/lib/security/rate-limit";
import { enforceRateLimits } from "@/lib/security/rate-limit-server";
import { logOperationalEvent, toSafeErrorMessage } from "@/lib/observability/operations";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { email?: unknown; password?: unknown; acceptTerms?: unknown };
    const email = normalizeEmail(body.email);
    const password = body.password;

    if (!isValidEmail(email)) {
      return NextResponse.json({ error: "Inserisci un indirizzo email valido." }, { status: 400 });
    }
    const problem = passwordProblem(password);
    if (problem) {
      return NextResponse.json({ error: PASSWORD_PROBLEM_MESSAGES[problem] }, { status: 400 });
    }
    if (body.acceptTerms !== true) {
      return NextResponse.json({ error: "Per registrarti devi accettare Privacy Policy e Termini di servizio." }, { status: 400 });
    }

    const limit = await enforceRateLimits("register", [
      { rule: RATE_LIMITS.registerIp, subject: clientIpFrom(req.headers) },
    ]);
    if (!limit.allowed) {
      return NextResponse.json({ error: "Troppi tentativi di registrazione. Riprova tra un'ora." }, { status: 429 });
    }

    // Stessa risposta (e stesso costo bcrypt) che l'indirizzo sia nuovo o già registrato:
    // la registrazione non rivela quali email hanno un account. Al titolare esistente
    // arriva un'email di avviso. Il confronto ignora maiuscole/minuscole.
    const hashed = await bcrypt.hash(password as string, 12);
    const accepted = () => NextResponse.json({ ok: true }, { status: 201 });

    if (await findUserIdByEmail(email)) {
      const notice = await enforceRateLimits("register_existing", [{ rule: RATE_LIMITS.registerEmail, subject: email }]);
      if (notice.allowed) await accountMailer.existingAccount(email);
      return accepted();
    }

    let user: { id: string; email: string };
    try {
      user = await prisma.user.create({
        data: {
          email,
          password: hashed,
          profiles: {
            create: {
              label: "Io",
              kind: ProfileKind.PERSON,
              isDefault: true,
            },
          },
        },
        select: { id: true, email: true },
      });
    } catch (error) {
      // Registrazione concorrente con la stessa email (vincolo UNIQUE).
      if ((error as { code?: string }).code === "P2002") return accepted();
      throw error;
    }

    try {
      await prisma.$executeRaw`
        INSERT INTO "UserConsent" ("id", "userId", "kind", "version", "acceptedAt")
        VALUES (${randomUUID()}, ${user.id}, 'TERMS_PRIVACY', ${LEGAL_DOCUMENTS_VERSION}, now())`;
    } catch (error) {
      // Migrazione 004 non ancora applicata: la registrazione non viene bloccata.
      logOperationalEvent("account.consent_not_recorded", {
        missingTable: isMissingTableError(error),
        error: toSafeErrorMessage(error, 120),
      }, "warn");
    }

    // Verifica email: disponibile dopo la migrazione 005; non blocca mai la registrazione.
    try {
      if (await ensureAccountState(user.id)) {
        const token = await issueEmailToken(user.id, "VERIFY_EMAIL");
        await accountMailer.verify(user.email, token);
      }
    } catch (error) {
      logOperationalEvent("account.verification_not_sent", { error: toSafeErrorMessage(error, 120) }, "warn");
    }

    return accepted();
  } catch {
    return NextResponse.json({ error: "Errore interno del server." }, { status: 500 });
  }
}
