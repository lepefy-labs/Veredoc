"use client";

import { Suspense, useState, useCallback, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useSearchParams, useRouter } from "next/navigation";
import FileUploader from "@/components/FileUploader";
import AnalysisResult, { type DocMeta } from "@/components/AnalysisResult";
import Card from "@/components/ui/Card";
import Link from "next/link";
import { TEXTS } from "@/lib/config/texts";

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
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [docMeta, setDocMeta] = useState<DocMeta | null>(null);

  const resetToForm = useCallback(() => {
    setDocumentId(null);
    setDocMeta(null);
    router.replace("/analyze");
  }, [router]);

  async function handleUpload(file: File, tipo: string) {
    setUploading(true);
    setUploadError(null);
    setDocumentId(null);
    setDocMeta(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("tipo", tipo);

    const res = await fetch("/api/documents/upload", {
      method: "POST",
      body: formData,
    });

    setUploading(false);

    if (!res.ok) {
      const data = await res.json() as { error: string; message?: string };
      setUploadError(data.message ?? data.error ?? "Errore durante l'upload.");
      return;
    }

    const data = await res.json() as { id: string };
    setDocumentId(data.id);
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
        ) : (
          <Card>
            <FileUploader onUpload={handleUpload} loading={uploading} />
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
