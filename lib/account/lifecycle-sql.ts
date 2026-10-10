import { Prisma } from "@prisma/client";

// Query del ciclo di vita account (migrazione 005). Testate su PGlite.

export type EmailTokenPurpose = "VERIFY_EMAIL" | "CHANGE_EMAIL";

export interface SessionStateRow {
  plan: string;
  email: string;
  hasState: boolean;
  sessionVersion: number | null;
  emailVerifiedAt: Date | null;
}

export function sessionStateSql(userId: string): Prisma.Sql {
  return Prisma.sql`
    SELECT u."plan"::text AS "plan", u."email",
           (s."userId" IS NOT NULL) AS "hasState",
           s."sessionVersion", s."emailVerifiedAt"
    FROM "User" u
    LEFT JOIN "AccountState" s ON s."userId" = u."id"
    WHERE u."id" = ${userId}`;
}

export function ensureAccountStateSql(userId: string): Prisma.Sql {
  return Prisma.sql`
    INSERT INTO "AccountState" ("userId", "emailVerifiedAt", "sessionVersion", "updatedAt")
    VALUES (${userId}, NULL, 0, now())
    ON CONFLICT ("userId") DO NOTHING`;
}

// Invalida tutte le sessioni JWT emesse prima (cambio/reset password).
export function bumpSessionVersionSql(userId: string): Prisma.Sql {
  return Prisma.sql`
    INSERT INTO "AccountState" ("userId", "emailVerifiedAt", "sessionVersion", "updatedAt")
    VALUES (${userId}, NULL, 1, now())
    ON CONFLICT ("userId") DO UPDATE
      SET "sessionVersion" = "AccountState"."sessionVersion" + 1,
          "updatedAt" = now()
    RETURNING "sessionVersion"`;
}

export function markEmailVerifiedSql(userId: string): Prisma.Sql {
  return Prisma.sql`
    INSERT INTO "AccountState" ("userId", "emailVerifiedAt", "sessionVersion", "updatedAt")
    VALUES (${userId}, now(), 0, now())
    ON CONFLICT ("userId") DO UPDATE
      SET "emailVerifiedAt" = now(),
          "updatedAt" = now()`;
}

// Un solo token valido per scopo: i precedenti vengono invalidati.
export function revokeEmailTokensSql(userId: string, purpose: EmailTokenPurpose): Prisma.Sql {
  return Prisma.sql`
    UPDATE "EmailToken" SET "usedAt" = now()
    WHERE "userId" = ${userId} AND "purpose" = ${purpose} AND "usedAt" IS NULL`;
}

export function createEmailTokenSql(input: {
  id: string;
  userId: string;
  purpose: EmailTokenPurpose;
  tokenHash: string;
  newEmail: string | null;
  ttlSeconds: number;
}): Prisma.Sql {
  return Prisma.sql`
    INSERT INTO "EmailToken" ("id", "userId", "purpose", "tokenHash", "newEmail", "expiresAt", "createdAt")
    VALUES (${input.id}, ${input.userId}, ${input.purpose}, ${input.tokenHash}, ${input.newEmail},
            now() + make_interval(secs => ${input.ttlSeconds}), now())`;
}

// Consumo atomico: un token vale una sola volta anche con richieste concorrenti.
export function consumeEmailTokenSql(tokenHash: string, purpose: EmailTokenPurpose): Prisma.Sql {
  return Prisma.sql`
    UPDATE "EmailToken" SET "usedAt" = now()
    WHERE "tokenHash" = ${tokenHash}
      AND "purpose" = ${purpose}
      AND "usedAt" IS NULL
      AND "expiresAt" > now()
    RETURNING "userId", "newEmail"`;
}

// Applica il nuovo indirizzo solo se nessun altro account lo usa (confronto su lower()).
export function applyEmailChangeSql(userId: string, newEmail: string): Prisma.Sql {
  return Prisma.sql`
    UPDATE "User" SET "email" = ${newEmail}
    WHERE "id" = ${userId}
      AND NOT EXISTS (
        SELECT 1 FROM "User" other
        WHERE lower(other."email") = ${newEmail} AND other."id" <> ${userId}
      )`;
}
