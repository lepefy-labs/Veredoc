"use client";

import { Suspense, useState, useCallback, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useSearchParams, useRouter } from "next/navigation";
import FileUploader from "@/components/FileUploader";
import AnalysisResult, { type DocMeta } from "@/components/AnalysisResult";
import DocumentRedactor from "@/components/DocumentRedactor";
import Card from "@/components/ui/Card";
import Link from "next/link";
import { TEXTS } from "@/lib/config/texts";

type FlowState = "idle" | "redacting" | "uploading" | "done";

function AnalyzeContent() {
  const { data: session, status } = useSession();
  const searchParams = useSearchParams();
  const router = useRouter();
  const urlId = searchParams.get("id");

  const [documentId, setDocumentId] = useState<string | null>(urlId);

  useEffect(() => {
    setDocumentId(urlId);
    if (!urlId) setDocMeta(null);
  }, [urlId]);

  const [flowState, setFlowState] = useState<FlowState>("idle");
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingTipo, setPendingTipo] = useState<string>("luce");
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [docMeta, setDocMeta] = useState<DocMeta | null>(null);

  const resetToForm = useCallback(() => {
    setDocumentId(null);
    setDocMeta(null);
    setFlowState("idle");
    setPendingFile(null);
    router.replace("/analyze");
  }, [router]);

  function handleUpload(file: File, tipo: string) {
    setUploadError(null);
    setPendingFile(file);
    setPendingTipo(tipo);
    setFlowState("redacting");
  }

  async function handleRedacted(redactedPdfBase64: string) {
    if (!pendingFile) return;
    setFlowState("uploading");
    setUploadError(null);

    const res = await fetch("/api/documents/upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fileBase64: redactedPdfBase64,
        mimeType: "application/pdf",
        fileName: pendingFile.name,
        tipo: pendingTipo,
      }),
    });

    if (!res.ok) {
      const data = await res.json() as { error: string; message?: string };
      setUploadError(data.message ?? data.error ?? "Errore durante l'upload.");
      setFlowState("idle");
      return;
    }

    const data = await res.json() as { id: string };
    setDocumentId(data.id);
    setFlowState("done");
    router.replace(`/analyze?id=${data.id}`);
  }

  const pageTitle = documentId && docMeta ? docMeta.title : TEXTS.upload.title;
  const pageSubtitle = documentId && docMeta ? docMeta.subtitle : TEXTS.upload.subtitle;

  if (status === "loading") {
    return (
      <main className="min-h-screen flex items-center justify-center px-4">
        <p className="text-sm text-[#64748B]">Caricamento...</p>
      </main>
    );
  }

  if (!session) {
    return (
      <main className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center space-y-4">
          <p className="text-[#0F172A] font-medium">Non sei autenticato.</p>
          <div className="flex gap-3 justify-center">
            <Link
              href="/login"
              className="inline-flex items-center justify-center px-5 py-2 bg-[#1B4FD8] text-white rounded-lg font-medium hover:bg-[#1640B0] transition-colors text-sm"
            >
              Accedi
            </Link>
            <span className="self-center text-[#64748B] text-sm">oppure</span>
            <Link
              href="/register"
              className="inline-flex items-center justify-center px-5 py-2 bg-white text-[#0F172A] border border-[#E2E8F0] rounded-lg font-medium hover:bg-[#F7F9FC] transition-colors text-sm"
            >
              Registrati
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-4 py-10">
      <div className="max-w-2xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#0F172A]">{pageTitle}</h1>
            {pageSubtitle && (
              <p className="text-sm text-[#64748B] mt-1">{pageSubtitle}</p>
            )}
          </div>
          <Link href="/dashboard" className="text-sm text-[#1B4FD8] hover:underline">
            Dashboard →
          </Link>
        </div>

        {documentId ? (
          <AnalysisResult
            documentId={documentId}
            onReset={resetToForm}
            onDocLoaded={setDocMeta}
          />
        ) : flowState === "redacting" && pendingFile ? (
          <Card>
            <p className="text-sm font-medium text-[#0F172A] mb-4">
              Oscura i dati personali prima di inviare il documento
            </p>
            <DocumentRedactor
              file={pendingFile}
              onReady={handleRedacted}
              onCancel={resetToForm}
            />
          </Card>
        ) : flowState === "uploading" ? (
          <Card>
            <div className="flex items-center justify-center py-12">
              <p className="text-sm text-[#64748B]">Invio documento in corso...</p>
            </div>
          </Card>
        ) : (
          <Card>
            <FileUploader onUpload={handleUpload} loading={false} />
            {uploadError && <p className="mt-3 text-sm text-[#EF4444]">{uploadError}</p>}
          </Card>
        )}
      </div>
    </main>
  );
}

export default function AnalyzePage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen flex items-center justify-center px-4">
        <p className="text-sm text-[#64748B]">Caricamento...</p>
      </main>
    }>
      <AnalyzeContent />
    </Suspense>
  );
}
