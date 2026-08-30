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
    if (err) { setError(err); return; }
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
  }

  function handleSubmit() {
    if (!selectedFile) return;
    onUpload(selectedFile);
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-brand/20 bg-brand-soft px-4 py-3">
        <p className="text-sm font-medium text-ink">Non devi scegliere il tipo di documento.</p>
        <p className="text-xs text-muted mt-1">Veredoc riconosce automaticamente bollette luce, gas, internet/telefonia e buste paga.</p>
      </div>

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
        className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ${
          dragging ? "border-brand bg-brand-soft" : "border-line hover:border-brand hover:bg-page"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png"
          className="hidden"
          onChange={onInputChange}
        />
        <div className="flex flex-col items-center gap-2">
          <svg className="w-10 h-10 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          <p className="text-sm text-muted">
            {TEXTS.upload.dragDrop}{" "}
            <span className="text-brand font-medium">{TEXTS.upload.browse}</span>
          </p>
          <p className="text-xs text-muted">{TEXTS.upload.fileTypes}</p>
        </div>
      </div>

      {selectedFile && (
        <div className="flex items-center gap-2 text-sm text-ink bg-page px-4 py-2 rounded-lg border border-line">
          <svg className="w-4 h-4 text-brand" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <span className="truncate font-medium">{selectedFile.name}</span>
          <span className="shrink-0 text-xs text-muted">{(selectedFile.size / 1024 / 1024).toFixed(1)} MB</span>
          <button
            onClick={(e) => { e.stopPropagation(); setSelectedFile(null); }}
            aria-label="Rimuovi file selezionato"
            className="ml-auto shrink-0 px-1.5 py-0.5 rounded text-muted hover:text-danger focus-visible:outline-2 focus-visible:outline-brand"
          >✕</button>
        </div>
      )}

      {error && <p className="text-sm text-danger" role="alert">{error}</p>}

      <Button
        onClick={handleSubmit}
        disabled={!selectedFile || loading}
        loading={loading}
        size="lg"
        className="w-full"
      >
        {loading ? TEXTS.upload.analyzing : TEXTS.upload.analyzeButton}
      </Button>
    </div>
  );
}
