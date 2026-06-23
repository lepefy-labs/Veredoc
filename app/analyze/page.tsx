"use client";

import { useState } from "react";
import FileUploader from "@/components/FileUploader";
import AnalysisResult from "@/components/AnalysisResult";
import Card from "@/components/ui/Card";
import Link from "next/link";
import { TEXTS } from "@/lib/config/texts";

export default function AnalyzePage() {
  const [documentId, setDocumentId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  async function handleUpload(file: File, tipo: string) {
    setUploading(true);
    setUploadError(null);
    setDocumentId(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("tipo", tipo);

    const res = await fetch("/api/documents/upload", {
      method: "POST",
      body: formData,
    });

    setUploading(false);

    if (!res.ok) {
      const data = await res.json() as { error: string };
      setUploadError(data.error ?? "Errore durante l'upload.");
      return;
    }

    const data = await res.json() as { id: string };
    setDocumentId(data.id);
  }

  return (
    <main className="min-h-screen px-4 py-10">
      <div className="max-w-2xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#0F172A]">{TEXTS.upload.title}</h1>
            <p className="text-sm text-[#64748B] mt-1">{TEXTS.upload.subtitle}</p>
          </div>
          <Link href="/dashboard" className="text-sm text-[#1B4FD8] hover:underline">
            Dashboard →
          </Link>
        </div>

        <Card>
          <FileUploader onUpload={handleUpload} loading={uploading} />
          {uploadError && <p className="mt-3 text-sm text-[#EF4444]">{uploadError}</p>}
        </Card>

        {documentId && <AnalysisResult documentId={documentId} />}
      </div>
    </main>
  );
}
