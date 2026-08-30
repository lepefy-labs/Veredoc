"use client";

import { Suspense, useCallback, useState } from "react";
import { useSession } from "next-auth/react";
import { useSearchParams, useRouter } from "next/navigation";
import FileUploader from "@/components/FileUploader";
import AnalysisResult, { type DocMeta } from "@/components/AnalysisResult";
import DocumentRedactor from "@/components/DocumentRedactor";
import ProfileSelector from "@/components/ProfileSelector";
import Card from "@/components/ui/Card";
import Link from "next/link";
import { TEXTS } from "@/lib/config/texts";

type FlowState = "idle" | "redacting" | "uploading" | "done";

function AnalyzeFlow({ initialDocumentId, profileId }: { initialDocumentId: string | null; profileId: string | null }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [documentId, setDocumentId] = useState<string | null>(initialDocumentId);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(profileId);
  const [flowState, setFlowState] = useState<FlowState>("idle");
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [docMeta, setDocMeta] = useState<DocMeta | null>(null);

  const handleProfileSelect = useCallback((nextProfileId: string) => {
    setSelectedProfileId(nextProfileId);
    setUploadError(null);
    if (profileId !== nextProfileId) {
      router.replace(`/analyze?profile=${encodeURIComponent(nextProfileId)}`, { scroll: false });
    }
  }, [profileId, router]);

  function resetToForm() {
    setDocumentId(null);
    setDocMeta(null);
    setFlowState("idle");
    setPendingFile(null);
    setUploadError(null);
    router.replace(selectedProfileId ? `/analyze?profile=${encodeURIComponent(selectedProfileId)}` : "/analyze");
  }

  async function handleUpload(file: File) {
    setUploadError(null);
    if (!selectedProfileId) {
      setUploadError("Seleziona il profilo a cui appartiene il documento prima di continuare.");
      return;
    }

    const isPro = session?.user?.plan === "PRO";

    if (isPro) {
      setPendingFile(file);
      setFlowState("redacting");
      return;
    }

    setPendingFile(file);
    setFlowState("uploading");

    const formData = new FormData();
    formData.append("file", file);
    formData.append("profileId", selectedProfileId);
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
    if (!pendingFile || !selectedProfileId) {
      setUploadError("Profilo del documento non disponibile. Torna al caricamento e selezionalo di nuovo.");
      setFlowState("idle");
      return;
    }

    setFlowState("uploading");
    setUploadError(null);

    const res = await fetch("/api/documents/upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fileBase64: redactedPdfBase64,
        mimeType: "application/pdf",
        fileName: pendingFile.name,
        profileId: selectedProfileId,
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
    return <main className="min-h-screen flex items-center justify-center px-4"><p className="text-sm text-muted">Caricamento...</p></main>;
  }

  if (!session) {
    return (
      <main className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center space-y-4">
          <p className="text-ink font-medium">Non sei autenticato.</p>
          <div className="flex gap-3 justify-center">
            <Link href="/login" className="inline-flex items-center justify-center px-5 py-2 bg-brand text-white rounded-lg font-medium hover:bg-brand-dark transition-colors text-sm">Accedi</Link>
            <span className="self-center text-muted text-sm">oppure</span>
            <Link href="/register" className="inline-flex items-center justify-center px-5 py-2 bg-white text-ink border border-line rounded-lg font-medium hover:bg-page transition-colors text-sm">Registrati</Link>
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
            {pageSubtitle && <p className="text-sm text-muted mt-1">{pageSubtitle}</p>}
          </div>
          <Link href="/dashboard" className="text-sm text-brand hover:underline">Dashboard →</Link>
        </div>

        {documentId ? (
          <AnalysisResult documentId={documentId} onReset={resetToForm} onDocLoaded={setDocMeta} />
        ) : flowState === "redacting" && pendingFile ? (
          <Card>
            <div className="mb-4 rounded-lg border border-line bg-page px-3 py-2">
              <p className="text-xs text-muted">Il documento resterà associato al profilo scelto prima dell'upload.</p>
            </div>
            <p className="text-sm font-medium text-ink mb-4">Oscura i dati personali prima di inviare il documento</p>
            <DocumentRedactor file={pendingFile} onReady={handleRedacted} onCancel={resetToForm} />
          </Card>
        ) : flowState === "uploading" ? (
          <Card><div className="flex items-center justify-center py-12"><p className="text-sm text-muted">Invio documento in corso...</p></div></Card>
        ) : (
          <Card>
            <div className="space-y-5">
              <ProfileSelector
                initialProfileId={profileId}
                selectedProfileId={selectedProfileId}
                onSelect={handleProfileSelect}
              />
              <div className="border-t border-line pt-5">
                <FileUploader onUpload={handleUpload} loading={false} />
              </div>
            </div>
            {uploadError && <p className="mt-3 text-sm text-danger" role="alert">{uploadError}</p>}
          </Card>
        )}
      </div>
    </main>
  );
}

function AnalyzeContent() {
  const searchParams = useSearchParams();
  const urlId = searchParams.get("id");
  const profileId = searchParams.get("profile");

  return <AnalyzeFlow key={urlId ?? "new"} initialDocumentId={urlId} profileId={profileId} />;
}

export default function AnalyzePage() {
  return (
    <Suspense fallback={<main className="min-h-screen flex items-center justify-center px-4"><p className="text-sm text-muted">Caricamento...</p></main>}>
      <AnalyzeContent />
    </Suspense>
  );
}
