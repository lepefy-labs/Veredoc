import { createHash, randomBytes, randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import {
  consumeEmailTokenSql,
  createEmailTokenSql,
  revokeEmailTokensSql,
  type EmailTokenPurpose,
} from "@/lib/account/lifecycle-sql";

export const EMAIL_TOKEN_TTL_SECONDS = 24 * 60 * 60;

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

// Crea un token monouso (il valore in chiaro esiste solo nel link email).
export async function issueEmailToken(userId: string, purpose: EmailTokenPurpose, newEmail: string | null = null): Promise<string> {
  const token = randomBytes(32).toString("hex");
  await prisma.$transaction([
    prisma.$executeRaw(revokeEmailTokensSql(userId, purpose)),
    prisma.$executeRaw(createEmailTokenSql({
      id: randomUUID(),
      userId,
      purpose,
      tokenHash: hashToken(token),
      newEmail,
      ttlSeconds: EMAIL_TOKEN_TTL_SECONDS,
    })),
  ]);
  return token;
}

export async function consumeEmailToken(token: string, purpose: EmailTokenPurpose) {
  if (!/^[0-9a-f]{64}$/.test(token)) return null;
  const [row] = await prisma.$queryRaw<Array<{ userId: string; newEmail: string | null }>>(
    consumeEmailTokenSql(hashToken(token), purpose)
  );
  return row ?? null;
}
