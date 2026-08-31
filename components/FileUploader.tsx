"use client";

import { useRef, useState, DragEvent, ChangeEvent } from "react";
import Button from "@/components/ui/Button";
import { ACCEPTED_FILE_TYPES, MAX_FILE_SIZE_BYTES } from "@/lib/config/constants";
import { TEXTS } from "@/lib/config/texts";

interface FileUploaderProps {
  onUpload: (file: File) => void;
  loading: boolean;
}

export default function FileUploader({ onUpload, loading }: FileUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  function validateFile(file: File): string | null {
    if (!ACCEPTED_FILE_TYPES.includes(file.type)) return "Tipo file non supportato. Usa PDF, JPG o PNG.";
    if (file.size > MAX_FILE_SIZE_BYTES) return "File troppo grande. Massimo 10MB.";
    return null;
  }

  function handleFile(file: File) {
    const err = validateFile(file);
    if (err) {
      setError(err);
      return;
    }
    setError(null);
    setSelectedFile(file);
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  function onInputChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = "";
  }

  function handleSubmit() {
    if (!selectedFile) return;
    onUpload(selectedFile);
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-brand/20 bg-brand-soft px-4 py-3">
        <p className="text-sm font-medium text-ink">Non devi scegliere il tipo di documento.</p>
        <p className="mt-1 text-xs leading-5 text-muted">Veredoc riconosce automaticamente bollette luce, gas, internet/telefonia e buste paga.</p>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png"
        className="hidden"
        onChange={onInputChange}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={onInputChange}
      />

      <div className="grid grid-cols-2 gap-3 sm:hidden">
        <button
          type="button"
          onClick={() => cameraInputRef.current?.click()}
          className="flex min-h-24 flex-col items-center justify-center gap-2 rounded-2xl border border-brand/20 bg-brand-soft px-3 text-center text-sm font-semibold text-brand transition-colors hover:bg-brand/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        >
          <svg viewBox="0 0 24 24" fill="none" className="h-7 w-7" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 8.5A1.5 1.5 0 015.5 7h2l1-2h7l1 2h2A1.5 1.5 0 0120 8.5v9a1.5 1.5 0 01-1.5 1.5h-13A1.5 1.5 0 014 17.5v-9z" />
            <circle cx="12" cy="13" r="3" />
          </svg>
          Scatta foto
        </button>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex min-h-24 flex-col items-center justify-center gap-2 rounded-2xl border border-line bg-white px-3 text-center text-sm font-semibold text-ink transition-colors hover:bg-page focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        >
          <svg viewBox="0 0 24 24" fill="none" className="h-7 w-7 text-brand" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M7 3.5h7l4 4v13H7a2 2 0 01-2-2v-13a2 2 0 012-2zM14 3.5v4h4" />
          </svg>
          Scegli file
        </button>
      </div>

      <p className="text-center text-xs text-muted sm:hidden">Foto nitida, documento intero e senza riflessi. PDF, JPG o PNG fino a 10 MB.</p>

      <div
        role="button"
        tabIndex={0}
        aria-label="Carica un documento: trascina il file qui o premi Invio per sfogliare"
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        className={`hidden cursor-pointer rounded-xl border-2 border-dashed p-10 text-center transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand sm:block ${dragging ? "border-brand bg-brand-soft" : "border-line hover:border-brand hover:bg-page"}`}
      >
        <div className="flex flex-col items-center gap-2">
          <svg className="h-10 w-10 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          <p className="text-sm text-muted">
            {TEXTS.upload.dragDrop}{" "}
            <span className="font-medium text-brand">{TEXTS.upload.browse}</span>
          </p>
          <p className="text-xs text-muted">{TEXTS.upload.fileTypes}</p>
        </div>
      </div>

      {selectedFile && (
        <div className="flex items-center gap-2 rounded-xl border border-line bg-page px-4 py-3 text-sm text-ink">
          <svg className="h-4 w-4 shrink-0 text-brand" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <span className="min-w-0 flex-1 truncate font-medium">{selectedFile.name}</span>
          <span className="shrink-0 text-xs text-muted">{(selectedFile.size / 1024 / 1024).toFixed(1)} MB</span>
          <button
            type="button"
            onClick={() => setSelectedFile(null)}
            aria-label="Rimuovi file selezionato"
            className="ml-auto shrink-0 rounded px-1.5 py-0.5 text-muted hover:text-danger focus-visible:outline-2 focus-visible:outline-brand"
          >
            ✕
          </button>
        </div>
      )}

      {error && <p className="text-sm text-danger" role="alert">{error}</p>}

      <Button onClick={handleSubmit} disabled={!selectedFile || loading} loading={loading} size="lg" className="min-h-12 w-full">
        {loading ? TEXTS.upload.analyzing : TEXTS.upload.analyzeButton}
      </Button>
    </div>
  );
}
