"use client";

import { Suspense, useState } from "react";
import { useSession } from "next-auth/react";
import { useSearchParams, useRouter } from "next/navigation";
import FileUploader from "@/components/FileUploader";
import AnalysisResult, { type DocMeta } from "@/components/AnalysisResult";
import DocumentRedactor from "@/components/DocumentRedactor";
import Card from "@/components/ui/Card";
import Link from "next/link";
import { TEXTS } from "@/lib/config/texts";

type FlowState = "idle" | "redacting" | "uploading" | "done";

function AnalyzeFlow({ initialDocumentId }: { initialDocumentId: string | null }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [documentId, setDocumentId] = useState<string | null>(initialDocumentId);
  const [flowState, setFlowState] = useState<FlowState>("idle");
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingTipo, setPendingTipo] = useState<string>("luce");
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [docMeta, setDocMeta] = useState<DocMeta | null>(null);

  function resetToForm() {
    setDocumentId(null);
    setDocMeta(null);
    setFlowState("idle");
    setPendingFile(null);
    router.replace("/analyze");
  }

  async function handleUpload(file: File, tipo: string) {
    setUploadError(null);
    const isPro = session?.user?.plan === "PRO";

    if (isPro) {
      setPendingFile(file);
      setPendingTipo(tipo);
      setFlowState("redacting");
      return;
    }

    setPendingFile(file);
    setPendingTipo(tipo);
    setFlowState("uploading");

    const formData = new FormData();
    formData.append("file", file);
    formData.append("tipo", tipo);
    const res = await fetch("/api/documents/upload", {
      method: "POST",
      body: formData,
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
        <p className="text-sm text-muted">Caricamento...</p>
      </main>
    );
  }

  if (!session) {
    return (
      <main className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center space-y-4">
          <p className="text-ink font-medium">Non sei autenticato.</p>
          <div className="flex gap-3 justify-center">
            <Link
              href="/login"
              className="inline-flex items-center justify-center px-5 py-2 bg-brand text-white rounded-lg font-medium hover:bg-brand-dark transition-colors text-sm"
            >
              Accedi
            </Link>
            <span className="self-center text-muted text-sm">oppure</span>
            <Link
              href="/register"
              className="inline-flex items-center justify-center px-5 py-2 bg-white text-ink border border-line rounded-lg font-medium hover:bg-page transition-colors text-sm"
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
            <h1 className="text-2xl font-bold text-ink">{pageTitle}</h1>
            {pageSubtitle && (
              <p className="text-sm text-muted mt-1">{pageSubtitle}</p>
            )}
          </div>
          <Link href="/dashboard" className="text-sm text-brand hover:underline">
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
            <p className="text-sm font-medium text-ink mb-4">
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
              <p className="text-sm text-muted">Invio documento in corso...</p>
            </div>
          </Card>
        ) : (
          <Card>
            <FileUploader onUpload={handleUpload} loading={false} />
            {uploadError && <p className="mt-3 text-sm text-danger">{uploadError}</p>}
          </Card>
        )}
      </div>
    </main>
  );
}

function AnalyzeContent() {
  const searchParams = useSearchParams();
  const urlId = searchParams.get("id");

  return <AnalyzeFlow key={urlId ?? "new"} initialDocumentId={urlId} />;
}

export default function AnalyzePage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen flex items-center justify-center px-4">
        <p className="text-sm text-muted">Caricamento...</p>
      </main>
    }>
      <AnalyzeContent />
    </Suspense>
  );
}
