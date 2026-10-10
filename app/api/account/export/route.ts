// GET /api/account/export — copia dei dati dell'account in JSON (portabilità, Art. 20 GDPR).
// Include account, consensi, profili, documenti con dati estratti e analisi, notifiche inviate,
// e link temporanei (24 h) per scaricare i file originali ancora conservati.
// Esclusi: hash della password, token, stato tecnico interno del worker.

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { AnalysisStatus } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { RATE_LIMITS } from "@/lib/security/rate-limit";
import { enforceRateLimits } from "@/lib/security/rate-limit-server";
import { logOperationalEvent } from "@/lib/observability/operations";

const SIGNED_URL_SECONDS = 24 * 60 * 60;

function withoutJobState(analysis: unknown): unknown {
  if (!analysis || typeof analysis !== "object" || Array.isArray(analysis)) return analysis;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { _job, ...rest } = analysis as Record<string, unknown>;
  return rest;
}

async function optionalRows<T>(query: () => Promise<T[]>): Promise<T[]> {
  try {
    return await query();
  } catch {
    return []; // tabella non ancora migrata
  }
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Non autenticato." }, { status: 401 });
  const userId = session.user.id;

  const limit = await enforceRateLimits("account_export", [{ rule: RATE_LIMITS.exportUser, subject: userId }]);
  if (!limit.allowed) return NextResponse.json({ error: "Troppe esportazioni. Riprova tra un'ora." }, { status: 429 });

  const [user, profiles, documents, consents, notifications] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { email: true, plan: true, createdAt: true } }),
    prisma.analysisProfile.findMany({
      where: { userId },
      select: { id: true, label: true, kind: true, isDefault: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.document.findMany({
      where: { userId, status: { not: AnalysisStatus.DELETED } },
      select: {
        id: true, profileId: true, type: true, fileName: true, filePath: true, status: true,
        createdAt: true, rawExtracted: true, analysis: true,
      },
      orderBy: { createdAt: "asc" },
    }),
    optionalRows(() => prisma.userConsent.findMany({ where: { userId }, select: { kind: true, version: true, acceptedAt: true } })),
    optionalRows(() => prisma.notificationOutbox.findMany({
      where: { userId },
      select: { documentId: true, eventType: true, status: true, createdAt: true, sentAt: true },
      orderBy: { createdAt: "asc" },
    })),
  ]);
  if (!user) return NextResponse.json({ error: "Non autenticato." }, { status: 401 });

  const paths = documents.map((document) => document.filePath).filter((path): path is string => Boolean(path));
  const signed = new Map<string, string>();
  if (paths.length > 0) {
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
    const { data } = await supabase.storage.from("documents").createSignedUrls(paths, SIGNED_URL_SECONDS);
    for (const entry of data ?? []) {
      if (entry.path && entry.signedUrl) signed.set(entry.path, entry.signedUrl);
    }
  }

  const exportedAt = new Date();
  const payload = {
    format: "veredoc-export-v1",
    exportedAt: exportedAt.toISOString(),
    note: "I link ai file originali scadono 24 ore dopo l'esportazione.",
    account: { email: user.email, plan: user.plan, createdAt: user.createdAt },
    consents,
    profiles,
    documents: documents.map(({ filePath, analysis, ...document }) => ({
      ...document,
      analysis: withoutJobState(analysis),
      originalFileUrl: filePath ? signed.get(filePath) ?? null : null,
    })),
    notifications,
  };

  logOperationalEvent("account.exported", { userId, documents: documents.length });
  const filename = `veredoc-dati-${exportedAt.toISOString().slice(0, 10)}.json`;
  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
