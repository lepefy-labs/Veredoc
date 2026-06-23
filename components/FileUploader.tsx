"use client";

import { useRef, useState, DragEvent, ChangeEvent } from "react";
import Button from "@/components/ui/Button";
import { ACCEPTED_FILE_TYPES, MAX_FILE_SIZE_BYTES } from "@/lib/config/constants";
import { TEXTS } from "@/lib/config/texts";

interface FileUploaderProps {
  onUpload: (file: File, tipo: string) => void;
  loading: boolean;
}

const TIPI = [
  { value: "luce", label: "Bolletta Luce" },
  { value: "gas", label: "Bolletta Gas" },
  { value: "internet", label: "Bolletta Internet/Telefonia" },
  { value: "busta_paga", label: "Busta Paga" },
];

export default function FileUploader({ onUpload, loading }: FileUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [tipo, setTipo] = useState("luce");
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
    onUpload(selectedFile, tipo);
  }

  return (
    <div className="space-y-4">
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${
          dragging ? "border-[#1B4FD8] bg-[#EFF4FF]" : "border-[#E2E8F0] hover:border-[#1B4FD8] hover:bg-[#F7F9FC]"
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
          <svg className="w-10 h-10 text-[#64748B]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          <p className="text-sm text-[#64748B]">
            {TEXTS.upload.dragDrop}{" "}
            <span className="text-[#1B4FD8] font-medium">{TEXTS.upload.browse}</span>
          </p>
          <p className="text-xs text-[#64748B]">{TEXTS.upload.fileTypes}</p>
        </div>
      </div>

      {selectedFile && (
        <div className="flex items-center gap-2 text-sm text-[#0F172A] bg-[#F7F9FC] px-4 py-2 rounded-lg border border-[#E2E8F0]">
          <svg className="w-4 h-4 text-[#1B4FD8]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <span className="truncate font-medium">{selectedFile.name}</span>
          <button onClick={(e) => { e.stopPropagation(); setSelectedFile(null); }} className="ml-auto text-[#64748B] hover:text-[#EF4444]">✕</button>
        </div>
      )}

      {error && <p className="text-sm text-[#EF4444]">{error}</p>}

      <div>
        <label className="block text-sm font-medium text-[#0F172A] mb-1">Tipo documento</label>
        <select
          value={tipo}
          onChange={(e) => setTipo(e.target.value)}
          className="w-full rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm text-[#0F172A] bg-white focus:outline-none focus:ring-2 focus:ring-[#1B4FD8]"
        >
          {TIPI.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
      </div>

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
