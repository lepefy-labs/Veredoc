"use client";

import { useState } from "react";
import Link from "next/link";
import Badge from "@/components/ui/Badge";
import Card from "@/components/ui/Card";
import { DOCUMENTO_LABEL } from "@/lib/config/constants";
import { TEXTS } from "@/lib/config/texts";
import { AnalysisStatus, DocumentType } from "@prisma/client";

interface DocumentItem {
  id: string;
  type: DocumentType;
  fileName: string;
  status: AnalysisStatus;
  createdAt: Date;
  analysis: unknown;
}

interface DocumentListProps {
  initialDocuments: DocumentItem[];
}

function ConfirmDialog({
  onConfirm,
  onCancel,
  loading,
}: {
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-lg p-6 max-w-sm w-full mx-4 space-y-4">
        <p className="text-sm text-[#0F172A]">
          Sei sicuro di voler eliminare questo documento? I dati analizzati verranno rimossi definitivamente.
        </p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2 text-sm text-[#64748B] border border-[#E2E8F0] rounded-lg hover:bg-[#F7F9FC] disabled:opacity-60"
          >
            Annulla
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="px-4 py-2 text-sm text-white bg-[#EF4444] rounded-lg hover:bg-red-600 disabled:opacity-60"
          >
            {loading ? "Eliminazione…" : "Elimina"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function DocumentList({ initialDocuments }: DocumentListProps) {
  const [documents, setDocuments] = useState(initialDocuments);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<Record<string, string>>({});

  async function handleDelete(id: string) {
    setDeleting(true);
    try {
      const res = await fetch(`/api/documents/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json() as { error?: string };
        setDeleteError((prev) => ({ ...prev, [id]: data.error ?? "Errore durante l'eliminazione." }));
      } else {
        setDocuments((prev) => prev.filter((d) => d.id !== id));
      }
    } catch {
      setDeleteError((prev) => ({ ...prev, [id]: "Errore di rete." }));
    } finally {
      setDeleting(false);
      setConfirmDeleteId(null);
    }
  }

  if (documents.length === 0) {
    return (
      <Card className="text-center py-12">
        <p className="text-[#64748B] text-sm">{TEXTS.dashboard.empty}</p>
        <Link href="/analyze" className="mt-4 inline-block text-sm text-[#1B4FD8] hover:underline">
          {TEXTS.dashboard.newAnalysis}
        </Link>
      </Card>
    );
  }

  return (
    <>
      {confirmDeleteId && (
        <ConfirmDialog
          onConfirm={() => handleDelete(confirmDeleteId)}
          onCancel={() => setConfirmDeleteId(null)}
          loading={deleting}
        />
      )}
      <div className="space-y-3">
        {documents.map((doc) => {
          const analysis = (doc.analysis ?? null) as Record<string, unknown> | null;
          const importo = analysis?.importo_totale ?? analysis?.stipendio_netto;
          const fornitore = analysis?.fornitore ?? analysis?.datore_lavoro;

          return (
            <div key={doc.id} className="relative">
              <Link href={`/analyze?id=${doc.id}`}>
                <Card padding="sm" className="hover:shadow-md transition-shadow cursor-pointer">
                  <div className="flex items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-[#0F172A] truncate">
                          {DOCUMENTO_LABEL[doc.type] ?? doc.type}
                        </p>
                        <Badge status={doc.status as AnalysisStatus} />
                      </div>
                      <p className="text-xs text-[#64748B] mt-0.5 truncate">{doc.fileName}</p>
                      {fornitore != null && (
                        <p className="text-xs text-[#64748B]">{String(fornitore)}</p>
                      )}
                      {deleteError[doc.id] && (
                        <p className="text-xs text-[#EF4444] mt-1">{deleteError[doc.id]}</p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      {importo !== undefined && importo !== null && (
                        <p className="font-mono text-sm font-bold text-[#0F172A]">
                          {Number(importo).toLocaleString("it-IT", { style: "currency", currency: "EUR" })}
                        </p>
                      )}
                      <p className="text-xs text-[#64748B]">
                        {new Date(doc.createdAt).toLocaleDateString("it-IT")}
                      </p>
                    </div>
                  </div>
                </Card>
              </Link>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  setConfirmDeleteId(doc.id);
                }}
                className="absolute top-2 right-2 text-xs text-red-500 hover:text-red-700 px-2 py-1 rounded"
              >
                Elimina
              </button>
            </div>
          );
        })}
      </div>
    </>
  );
}
