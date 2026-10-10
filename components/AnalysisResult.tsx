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
  processing?: {
    attempts: number;
    maxAttempts: number;
    errorCode: string | null;
    canRetry: boolean;
  };
}

interface AnalysisResultProps {
  documentId: string;
  onReset?: () => void;
  onDocLoaded?: (meta: DocMeta) => void;
}

// Polling con backoff: frequente nei primi 2 minuti, poi rallenta e si ferma dopo 10 minuti.
const FAST_POLL_MS = 3000;
const SLOW_POLL_MS = 10000;
const FAST_POLL_WINDOW_MS = 2 * 60 * 1000;
const SLOW_THRESHOLD_MS = 90 * 1000;
const MAX_WAIT_MS = 10 * 60 * 1000;

const LOADING_MESSAGES = [
  "Riconosco il tipo di documento...",
  "Leggo le voci principali...",
  "Controllo coerenza e dati...",
  "Preparo il risultato...",
];

function LoadingSpinner({ title, note }: { title?: string; note?: string }) {
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
    <div className="flex flex-col items-center gap-4 py-12 text-center">
      <div className="w-10 h-10 border-4 border-brand border-t-transparent rounded-full animate-spin" />
      <p className="text-sm font-medium text-ink transition-all">{title ?? LOADING_MESSAGES[msgIdx]}</p>
      <p className="max-w-sm text-xs text-muted">{note ?? "L'analisi richiede circa 30-60 secondi"}</p>
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
  const [waitStartedAt, setWaitStartedAt] = useState(() => Date.now());
  const [elapsedMs, setElapsedMs] = useState(0);
  const [retrying, setRetrying] = useState(false);
  const [retryError, setRetryError] = useState<string | null>(null);

  function applyDoc(data: DocumentData, startedAt = waitStartedAt) {
    setDoc(data);
    setPolls((p) => p + 1);
    setElapsedMs(Date.now() - startedAt);
    if (data.status === "DONE" && onDocLoaded) {
      onDocLoaded(resolveDocMeta(data));
    }
  }

  function fetchDoc(startedAt = waitStartedAt) {
    return fetch(`/api/documents/${documentId}`)
      .then((r) => r.ok ? r.json() : null)
      .then((data) => data && applyDoc(data as DocumentData, startedAt));
  }

  useEffect(() => {
    if (!documentId) return;
    fetchDoc();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documentId]);

  const waitingForWorker = doc?.status === "PENDING" || doc?.status === "PROCESSING";
  const waitExpired = elapsedMs >= MAX_WAIT_MS;

  useEffect(() => {
    if (!doc || !waitingForWorker || waitExpired) return;

    const delay = elapsedMs < FAST_POLL_WINDOW_MS ? FAST_POLL_MS : SLOW_POLL_MS;
    const timer = setTimeout(() => fetchDoc(), delay);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc, polls, documentId, waitingForWorker, waitExpired]);

  function resumeWaiting() {
    const now = Date.now();
    setWaitStartedAt(now);
    setElapsedMs(0);
    fetchDoc(now);
  }

  async function retryAnalysis() {
    setRetrying(true);
    setRetryError(null);
    try {
      const response = await fetch(`/api/documents/${documentId}/retry`, { method: "POST" });
      if (!response.ok) {
        const body = await response.json().catch(() => null) as { error?: string } | null;
        setRetryError(body?.error ?? "Non è stato possibile riavviare l'analisi.");
        return;
      }
      resumeWaiting();
    } catch {
      setRetryError("Non è stato possibile riavviare l'analisi. Controlla la connessione e riprova.");
    } finally {
      setRetrying(false);
    }
  }

  if (!doc) return null;

  if (doc.status === "AWAITING_CONFIRMATION") {
    return (
      <div className="rounded-xl border border-line bg-white p-6 text-center space-y-4">
        <p className="text-sm font-medium text-ink">
          Questo documento è stato caricato con una versione precedente di Veredoc e non può essere completato.
        </p>
        <p className="text-sm text-muted">Carica di nuovo il file per ottenere l&apos;analisi aggiornata.</p>
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

  if (waitingForWorker) {
    if (waitExpired) {
      return (
        <div className="rounded-xl border border-line bg-white p-6 text-center space-y-4">
          <p className="text-sm font-medium text-ink">
            L&apos;analisi sta impiegando molto più tempo del previsto.
          </p>
          <p className="text-sm text-muted">
            Il documento resta in coda e il sistema lo riprende automaticamente: puoi ritrovarlo più tardi nella dashboard.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <button
              onClick={resumeWaiting}
              className="inline-flex items-center justify-center px-4 py-2 bg-brand text-white rounded-lg text-sm font-medium hover:bg-brand-dark transition-colors"
            >
              Controlla di nuovo
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

    const attempts = doc.processing?.attempts ?? 0;
    const maxAttempts = doc.processing?.maxAttempts ?? 3;
    const isRetry = (doc.status === "PENDING" && attempts > 0) || (doc.status === "PROCESSING" && attempts > 1);
    const slow = elapsedMs >= SLOW_THRESHOLD_MS;

    let title: string | undefined;
    if (isRetry) {
      const next = doc.status === "PENDING" ? attempts + 1 : attempts;
      title = `Nuovo tentativo automatico in corso (${Math.min(next, maxAttempts)} di ${maxAttempts})`;
    } else if (doc.status === "PENDING") {
      title = "Documento in coda per l'analisi...";
    }
    const note = slow
      ? "Sta impiegando più del previsto. Puoi chiudere questa pagina: ritroverai il risultato nella dashboard."
      : undefined;

    return <LoadingSpinner title={title} note={note} />;
  }

  if (doc.status === "ERROR") {
    const analysis = doc.analysis as Record<string, string> | null;
    const isUnsupported = analysis?.error === "documento_non_supportato";
    const errorMsg = isUnsupported
      ? analysis?.message
      : "Non siamo riusciti a completare l'analisi di questo documento, nemmeno con i tentativi automatici.";
    const canRetry = !isUnsupported && doc.processing?.canRetry === true;
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center space-y-4">
        <p className="text-sm font-medium text-red-700">{errorMsg}</p>
        {!isUnsupported && (
          <p className="text-sm text-red-700/80">
            {canRetry
              ? "Puoi riprovare l'analisi dello stesso file senza consumare un'altra analisi del tuo piano, oppure caricare un file più leggibile."
              : "Prova a caricare un file più leggibile (PDF originale o foto nitida)."}
          </p>
        )}
        {retryError && <p className="text-sm text-red-700">{retryError}</p>}
        <div className="flex flex-wrap gap-3 justify-center">
          {canRetry && (
            <button
              onClick={retryAnalysis}
              disabled={retrying}
              className="inline-flex items-center justify-center px-4 py-2 bg-brand text-white rounded-lg text-sm font-medium hover:bg-brand-dark transition-colors disabled:opacity-50"
            >
              {retrying ? "Riavvio..." : "Riprova l'analisi"}
            </button>
          )}
          {onReset && (
            <button
              onClick={onReset}
              className="inline-flex items-center justify-center px-4 py-2 bg-white text-ink border border-line rounded-lg text-sm font-medium hover:bg-page transition-colors"
            >
              Nuova analisi
            </button>
          )}
        </div>
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
