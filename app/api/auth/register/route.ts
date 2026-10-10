import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";
import { ProfileKind } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { findUserIdByEmail } from "@/lib/account/users";
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

    // Confronto senza distinzione maiuscole/minuscole: copre anche gli account creati
    // prima della normalizzazione delle email.
    if (await findUserIdByEmail(email)) {
      return NextResponse.json({ error: "Email già registrata." }, { status: 409 });
    }

    const hashed = await bcrypt.hash(password as string, 12);
    const user = await prisma.user.create({
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

    return NextResponse.json({ id: user.id, email: user.email }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Errore interno del server." }, { status: 500 });
  }
}
