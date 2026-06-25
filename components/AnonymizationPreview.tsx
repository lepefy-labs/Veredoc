"use client";

import { useState } from "react";

interface AnonymizationPreviewProps {
  documentId: string;
  anonymizedText: string;
  anonymizedMap: Record<string, string>;
  onConfirmed: () => void;
  onReset?: () => void;
}

const ENTITY_LABEL: Record<string, string> = {
  CODICE_FISCALE: "Codice Fiscale",
  IBAN: "IBAN",
  PARTITA_IVA: "Partita IVA",
  RAGIONE_SOCIALE: "Ragione Sociale",
  NOME: "Nome",
  INDIRIZZO: "Indirizzo",
  POD: "POD",
  PDR: "PDR",
  TELEFONO: "Telefono",
  NUMERO_CONTO: "N° Conto",
  EMAIL: "Email",
};

function labelFromPlaceholder(placeholder: string): string {
  const match = placeholder.match(/^\[([A-Z_]+)_\d+\]$/);
  if (!match) return placeholder;
  return ENTITY_LABEL[match[1]] ?? match[1];
}

export default function AnonymizationPreview({
  documentId,
  anonymizedText,
  anonymizedMap,
  onConfirmed,
  onReset,
}: AnonymizationPreviewProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const entries = Object.entries(anonymizedMap);

  async function handleConfirm() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/documents/${documentId}/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!res.ok) {
        const data = await res.json() as { error?: string };
        throw new Error(data.error ?? "Errore durante la conferma.");
      }
      onConfirmed();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore sconosciuto.");
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-[#E2E8F0] bg-white p-6 space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-[#0F172A]">
            Revisiona i dati che verranno mascherati
          </h2>
          <p className="text-sm text-[#64748B] mt-1">
            I valori originali sono visibili solo a te e non verranno mai inviati all&apos;AI.
            L&apos;analisi verrà eseguita sul testo anonimizzato.
          </p>
        </div>

        {entries.length === 0 ? (
          <p className="text-sm text-[#64748B] italic">Nessun dato personale rilevato.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-[#E2E8F0]">
                  <th className="text-left py-2 pr-4 font-medium text-[#64748B] w-1/4">Tipo</th>
                  <th className="text-left py-2 pr-4 font-medium text-[#64748B] w-2/5">Valore originale</th>
                  <th className="text-left py-2 font-medium text-[#64748B]">Placeholder</th>
                </tr>
              </thead>
              <tbody>
                {entries.map(([placeholder, original]) => (
                  <tr key={placeholder} className="border-b border-[#F1F5F9] last:border-0">
                    <td className="py-2 pr-4 text-[#64748B]">{labelFromPlaceholder(placeholder)}</td>
                    <td className="py-2 pr-4 font-mono text-[#0F172A] break-all">{original}</td>
                    <td className="py-2 font-mono text-[#1B4FD8] text-xs">{placeholder}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-[#E2E8F0] bg-white p-6 space-y-3">
        <h3 className="text-sm font-semibold text-[#0F172A]">Testo anonimizzato</h3>
        <p className="text-xs text-[#64748B]">Questo è il testo che verrà inviato all&apos;AI per l&apos;analisi.</p>
        <pre className="text-xs font-mono text-[#334155] bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg p-4 overflow-auto max-h-64 whitespace-pre-wrap break-words leading-relaxed">
          {anonymizedText}
        </pre>
      </div>

      {error && (
        <p className="text-sm text-[#EF4444]">{error}</p>
      )}

      <div className="flex gap-3">
        <button
          onClick={handleConfirm}
          disabled={loading}
          className="inline-flex items-center justify-center px-5 py-2.5 bg-[#1B4FD8] text-white rounded-lg font-medium hover:bg-[#1640B0] transition-colors text-sm disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {loading ? "Avvio analisi…" : "Conferma e avvia analisi"}
        </button>
        {onReset && (
          <button
            onClick={onReset}
            disabled={loading}
            className="inline-flex items-center justify-center px-5 py-2.5 bg-white text-[#0F172A] border border-[#E2E8F0] rounded-lg font-medium hover:bg-[#F7F9FC] transition-colors text-sm disabled:opacity-60"
          >
            Annulla
          </button>
        )}
      </div>
    </div>
  );
}
