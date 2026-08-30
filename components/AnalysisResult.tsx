"use client";

import { useEffect, useState, useRef } from "react";
import BollettaReport from "@/components/BollettaReport";
import BollettaDecisionSummary from "@/components/BollettaDecisionSummary";
import BustaPagaReport from "@/components/BustaPagaReport";
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
  typeCorrected?: boolean;
  typeSelectedByUser?: string | null;
}

interface AnalysisResultProps {
  documentId: string;
  onReset?: () => void;
  onDocLoaded?: (meta: DocMeta) => void;
}

const POLL_INTERVAL_MS = 3000;
const MAX_POLLS = 40;

const LOADING_MESSAGES = [
  "Riconosco il tipo di documento...",
  "Leggo le voci principali...",
  "Controllo coerenza e dati...",
  "Preparo il risultato...",
];

function LoadingSpinner() {
  const [msgIdx, setMsgIdx] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setMsgIdx((i) => (i + 1) % LOADING_MESSAGES.length);
    }, 3000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  return (
    <div className="flex flex-col items-center gap-4 py-12">
      <div className="w-10 h-10 border-4 border-brand border-t-transparent rounded-full animate-spin" />
      <p className="text-sm font-medium text-ink transition-all">{LOADING_MESSAGES[msgIdx]}</p>
      <p className="text-xs text-muted">L&apos;analisi richiede circa 30-60 secondi</p>
    </div>
  );
}

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
    if (!doc || doc.status === "DONE" || doc.status === "ERROR") return;
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

  if (doc.status === "PENDING" || doc.status === "PROCESSING" || doc.status === "AWAITING_CONFIRMATION") {
    if (polls >= MAX_POLLS) {
      return (
        <div className="rounded-xl border border-line bg-white p-6 text-center space-y-4">
          <p className="text-sm font-medium text-ink">
            L&apos;analisi sta impiegando più tempo del previsto.
          </p>
          <p className="text-sm text-muted">
            Il documento è in coda di elaborazione: puoi continuare ad attendere oppure ritrovarlo più tardi nella dashboard.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <button
              onClick={() => setPolls(0)}
              className="inline-flex items-center justify-center px-4 py-2 bg-brand text-white rounded-lg text-sm font-medium hover:bg-brand-dark transition-colors"
            >
              Continua ad attendere
            </button>
            <a
              href="/dashboard"
              className="inline-flex items-center justify-center px-4 py-2 bg-white text-ink border border-line rounded-lg text-sm font-medium hover:bg-page transition-colors"
            >
              Vai alla dashboard
            </a>
          </div>
        </div>
      );
    }
    return <LoadingSpinner />;
  }

  if (doc.status === "ERROR") {
    const analysis = doc.analysis as Record<string, string> | null;
    const isUnsupported = analysis?.error === "documento_non_supportato";
    const errorMsg = isUnsupported
      ? analysis?.message
      : "Analisi fallita. Riprova con un altro file.";
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center space-y-4">
        <p className="text-sm font-medium text-red-700">{errorMsg}</p>
        {onReset && (
          <button
            onClick={onReset}
            className="inline-flex items-center justify-center px-4 py-2 bg-brand text-white rounded-lg text-sm font-medium hover:bg-brand-dark transition-colors"
          >
            Nuova analisi
          </button>
        )}
      </div>
    );
  }

  const isBustaPaga = doc.type === "BUSTA_PAGA";

  if (isBustaPaga) {
    return <BustaPagaReport data={doc.analysis as BustaPagaData} />;
  }

  const bolletta = doc.analysis as BollettaAnalysis;
  return (
    <div className="space-y-6">
      <BollettaDecisionSummary data={bolletta} />
      <div id="confronto-mercato">
        <BollettaReport data={bolletta} documentId={doc.id} />
      </div>
    </div>
  );
}
