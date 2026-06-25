"use client";

import { useEffect, useState } from "react";
import BollettaReport from "@/components/BollettaReport";
import BustaPagaReport from "@/components/BustaPagaReport";
import Badge from "@/components/ui/Badge";
import { BollettaAnalysis } from "@/types/bolletta";
import { BustaPagaData } from "@/types/bustapaga";

interface Document {
  id: string;
  type: string;
  status: "PENDING" | "PROCESSING" | "DONE" | "ERROR";
  analysis: unknown;
  fileName: string;
}

interface AnalysisResultProps {
  documentId: string;
  onReset?: () => void;
}

const POLL_INTERVAL_MS = 3000;
const MAX_POLLS = 40;

export default function AnalysisResult({ documentId, onReset }: AnalysisResultProps) {
  const [doc, setDoc] = useState<Document | null>(null);
  const [polls, setPolls] = useState(0);

  useEffect(() => {
    if (!documentId) return;

    async function fetchDoc() {
      const res = await fetch(`/api/documents/${documentId}`);
      if (!res.ok) return;
      const data = await res.json() as Document;
      setDoc(data);
      setPolls((p) => p + 1);
    }

    fetchDoc();
  }, [documentId]);

  useEffect(() => {
    if (!doc || doc.status === "DONE" || doc.status === "ERROR") return;
    if (polls >= MAX_POLLS) return;

    const timer = setTimeout(async () => {
      const res = await fetch(`/api/documents/${documentId}`);
      if (!res.ok) return;
      const data = await res.json() as Document;
      setDoc(data);
      setPolls((p) => p + 1);
    }, POLL_INTERVAL_MS);

    return () => clearTimeout(timer);
  }, [doc, polls, documentId]);

  if (!doc) return null;

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
        : <BollettaReport data={doc.analysis as BollettaAnalysis} />}
    </div>
  );
}
