import { prisma } from "@/lib/prisma";

// Ricerca utente per email senza distinzione maiuscole/minuscole.
// Confronto esatto su lower(email) (niente ILIKE: "_" e "%" non sono jolly).
// Copre anche gli account creati prima della normalizzazione; in caso di doppioni
// storici che differiscono solo per maiuscole vince l'account più vecchio.
export async function findUserIdByEmail(normalizedEmail: string): Promise<string | null> {
  if (!normalizedEmail) return null;
  const rows = await prisma.$queryRaw<Array<{ id: string }>>`
    SELECT "id" FROM "User"
    WHERE lower("email") = ${normalizedEmail}
    ORDER BY "createdAt" ASC
    LIMIT 1`;
  return rows[0]?.id ?? null;
}
