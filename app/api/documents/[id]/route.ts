import { after, NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AnalysisStatus, Prisma } from "@prisma/client";
import { createClient } from "@supabase/supabase-js";
import { processDocumentAnalysis, shouldRecoverAnalysis } from "@/lib/jobs/process-document";
import {
  canRetryAnalysisManually,
  getAnalysisJob,
  MAX_ANALYSIS_ATTEMPTS,
} from "@/lib/jobs/process-document-core";
import { logOperationalEvent, toSafeErrorMessage } from "@/lib/observability/operations";
import { isDocumentOwner } from "@/lib/security/access";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export const maxDuration = 300;

function scheduleRecovery(documentId: string) {
  after(async () => {
    try {
      await processDocumentAnalysis(documentId);
    } catch (error) {
      logOperationalEvent("analysis.worker_crashed", {
        documentId,
        trigger: "document_read",
        error: toSafeErrorMessage(error),
      }, "error");
    }
  });
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autenticato." }, { status: 401 });
  }

  const { id } = await params;
  const document = await prisma.document.findUnique({ where: { id } });

  if (!document) {
    return NextResponse.json({ error: "Documento non trovato." }, { status: 404 });
  }

  if (!isDocumentOwner(session.user.id, document.userId)) {
    return NextResponse.json({ error: "Non autorizzato." }, { status: 403 });
  }

  if (shouldRecoverAnalysis(document)) {
    scheduleRecovery(document.id);
  }

  const job = getAnalysisJob(document.analysis);
  return NextResponse.json({
    ...document,
    processing: {
      attempts: job.attempts,
      maxAttempts: MAX_ANALYSIS_ATTEMPTS,
      errorCode: job.lastErrorCode ?? null,
      canRetry: canRetryAnalysisManually(document),
    },
  });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autenticato." }, { status: 401 });
  }

  const { id } = await params;
  const document = await prisma.document.findUnique({ where: { id } });

  if (!document) {
    return NextResponse.json({ error: "Documento non trovato." }, { status: 404 });
  }
  if (!isDocumentOwner(session.user.id, document.userId)) {
    return NextResponse.json({ error: "Non autorizzato." }, { status: 403 });
  }
  if (document.status === AnalysisStatus.DELETED) {
    return NextResponse.json({ error: "Documento già eliminato." }, { status: 400 });
  }

  if (document.filePath) {
    const supabase = getSupabase();
    await supabase.storage.from("documents").remove([document.filePath]);
  }

  await prisma.document.update({
    where: { id },
    data: {
      status: AnalysisStatus.DELETED,
      deletedAt: new Date(),
      fileName: "documento_eliminato",
      filePath: null,
      analysis: Prisma.DbNull,
      rawExtracted: Prisma.DbNull,
      anonymizedText: null,
      anonymizedMap: Prisma.DbNull,
    },
  });

  return NextResponse.json({ success: true });
}
