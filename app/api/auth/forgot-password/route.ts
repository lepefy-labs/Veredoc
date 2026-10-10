import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { sendPasswordResetEmail } from "@/lib/email";
import { TEXTS } from "@/lib/config/texts";
import { isValidEmail, normalizeEmail } from "@/lib/account/credentials";
import { findUserIdByEmail } from "@/lib/account/users";
import { clientIpFrom, RATE_LIMITS } from "@/lib/security/rate-limit";
import { enforceRateLimits } from "@/lib/security/rate-limit-server";

const TOKEN_TTL_MS = 60 * 60 * 1000;
const MAX_ACTIVE_TOKENS = 3;

export async function POST(req: NextRequest) {
  const genericResponse = () =>
    NextResponse.json({ message: TEXTS.forgotPassword.confirmation }, { status: 200 });

  try {
    const body = await req.json() as { email?: unknown };
    const email = normalizeEmail(body.email);
    if (!isValidEmail(email)) return genericResponse();

    // Risposta sempre generica: un limite superato non rivela se l'account esiste.
    const limit = await enforceRateLimits("forgot_password", [
      { rule: RATE_LIMITS.forgotEmail, subject: email },
      { rule: RATE_LIMITS.forgotIp, subject: clientIpFrom(req.headers) },
    ]);
    if (!limit.allowed) return genericResponse();

    const userId = await findUserIdByEmail(email);
    const user = userId ? await prisma.user.findUnique({ where: { id: userId } }) : null;
    if (!user) return genericResponse();

    const now = new Date();
    const activeTokens = await prisma.passwordResetToken.count({
      where: { userId: user.id, usedAt: null, expiresAt: { gt: now } },
    });
    if (activeTokens >= MAX_ACTIVE_TOKENS) return genericResponse();

    await prisma.passwordResetToken.updateMany({
      where: { userId: user.id, usedAt: null },
      data: { usedAt: now },
    });

    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");

    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt: new Date(now.getTime() + TOKEN_TTL_MS),
      },
    });

    await sendPasswordResetEmail(user.email, rawToken);

    return genericResponse();
  } catch {
    return genericResponse();
  }
}
