"use client";

import { useEffect, useState } from "react";
import BollettaReport from "@/components/BollettaReport";
import BustaPagaReport from "@/components/BustaPagaReport";
import AnonymizationPreview from "@/components/AnonymizationPreview";
import Badge from "@/components/ui/Badge";
import { BollettaAnalysis } from "@/types/bolletta";
import { BustaPagaData } from "@/types/bustapaga";

export interface DocMeta {
  title: string;
  subtitle: string;
}

export interface DocumentData {
  id: string;
  type: string;
  status: "PENDING" | "PROCESSING" | "AWAITING_CONFIRMATION" | "DONE" | "ERROR";
  analysis: unknown;
  fileName: string;
  anonymizedText?: string | null;
  anonymizedMap?: Record<string, string> | null;
}

interface AnalysisResultProps {
  documentId: string;
  onReset?: () => void;
  onDocLoaded?: (meta: DocMeta) => void;
}

const POLL_INTERVAL_MS = 3000;
const MAX_POLLS = 40;

const BOLLETTA_TIPO_LABEL: Record<string, string> = {
  luce: "Bolletta Luce",
  gas: "Bolletta Gas",
  internet: "Bolletta Internet",
  telefonia: "Bolletta Telefonia",
};

function resolveDocMeta(doc: DocumentData): DocMeta {
  if (doc.type === "BUSTA_PAGA") {
    const data = doc.analysis as BustaPagaData;
    return {
      title: "Busta Paga",
      subtitle: data?.datore_lavoro ?? "",
    };
  }
  const data = doc.analysis as BollettaAnalysis;
  return {
    title: BOLLETTA_TIPO_LABEL[data?.tipo] ?? "Bolletta",
    subtitle: data?.fornitore ?? "",
  };
}

export default function AnalysisResult({ documentId, onReset, onDocLoaded }: AnalysisResultProps) {
  const [doc, setDoc] = useState<DocumentData | null>(null);
  const [polls, setPolls] = useState(0);

  function applyDoc(data: DocumentData) {
    setDoc(data);
    setPolls((p) => p + 1);
    if (data.status === "DONE" && onDocLoaded) {
      onDocLoaded(resolveDocMeta(data));
    }
  }

  useEffect(() => {
    if (!documentId) return;
    fetch(`/api/documents/${documentId}`)
      .then((r) => r.ok ? r.json() : null)
      .then((data) => data && applyDoc(data as DocumentData));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documentId]);

  useEffect(() => {
    if (!doc || doc.status === "DONE" || doc.status === "ERROR" || doc.status === "AWAITING_CONFIRMATION") return;
    if (polls >= MAX_POLLS) return;

    const timer = setTimeout(() => {
      fetch(`/api/documents/${documentId}`)
        .then((r) => r.ok ? r.json() : null)
        .then((data) => data && applyDoc(data as DocumentData));
    }, POLL_INTERVAL_MS);

    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc, polls, documentId]);

  if (!doc) return null;

  if (doc.status === "AWAITING_CONFIRMATION") {
    return (
      <AnonymizationPreview
        documentId={doc.id}
        anonymizedText={doc.anonymizedText ?? ""}
        anonymizedMap={doc.anonymizedMap ?? {}}
        onConfirmed={() => {
          setDoc((prev) => prev ? { ...prev, status: "PROCESSING" } : prev);
          setPolls(0);
        }}
        onReset={onReset}
      />
    );
  }

  if (doc.status === "PENDING" || doc.status === "PROCESSING") {
    return (
      <div className="flex flex-col items-center gap-4 py-12">
        <div className="w-10 h-10 border-4 border-[#1B4FD8] border-t-transparent rounded-full animate-spin" />
        <Badge status={doc.status} />
        <p className="text-sm text-[#64748B]">Analisi in corso, attendere…</p>
      </div>
    );
  }

  if (doc.status === "ERROR") {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center space-y-4">
        <p className="text-sm font-medium text-red-700">Analisi fallita. Riprova con un altro file.</p>
        {onReset && (
          <button
            onClick={onReset}
            className="inline-flex items-center justify-center px-4 py-2 bg-[#1B4FD8] text-white rounded-lg text-sm font-medium hover:bg-[#1640B0] transition-colors"
          >
            Nuova analisi
          </button>
        )}
      </div>
    );
  }

  const isBustaPaga = doc.type === "BUSTA_PAGA";

  return (
    <div>
      {isBustaPaga
        ? <BustaPagaReport data={doc.analysis as BustaPagaData} />
        : <BollettaReport data={doc.analysis as BollettaAnalysis} documentId={doc.id} />}
    </div>
  );
}
