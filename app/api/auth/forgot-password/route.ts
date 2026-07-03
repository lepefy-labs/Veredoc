import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { sendPasswordResetEmail } from "@/lib/email";
import { TEXTS } from "@/lib/config/texts";

const TOKEN_TTL_MS = 60 * 60 * 1000;
const MAX_ACTIVE_TOKENS = 3;

export async function POST(req: NextRequest) {
  const genericResponse = () =>
    NextResponse.json({ message: TEXTS.forgotPassword.confirmation }, { status: 200 });

  try {
    const { email } = await req.json();
    if (!email) return genericResponse();

    const user = await prisma.user.findUnique({ where: { email } });
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
