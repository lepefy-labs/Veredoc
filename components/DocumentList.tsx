"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Badge from "@/components/ui/Badge";
import Card from "@/components/ui/Card";
import { DOCUMENTO_LABEL } from "@/lib/config/constants";
import { AnalysisStatus, DocumentType, ProfileKind } from "@prisma/client";

interface DocumentItem {
  id: string;
  profileId: string;
  type: DocumentType;
  fileName: string;
  status: AnalysisStatus;
  createdAt: Date | string;
  analysis: unknown;
}

interface ProfileOption {
  id: string;
  label: string;
  kind: ProfileKind;
  isDefault: boolean;
}

interface DocumentListProps {
  initialDocuments: DocumentItem[];
  profiles: ProfileOption[];
  currentProfileId: string;
}

function ConfirmDialog({ onConfirm, onCancel, loading }: { onConfirm: () => void; onCancel: () => void; loading: boolean }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 p-4 sm:items-center" onClick={onCancel}>
      <div role="dialog" aria-modal="true" aria-labelledby="confirm-delete-title" onClick={(e) => e.stopPropagation()} className="w-full max-w-sm space-y-4 rounded-2xl bg-white p-5 shadow-lg sm:p-6">
        <p id="confirm-delete-title" className="text-sm leading-6 text-ink">Sei sicuro di voler eliminare questo documento? I dati analizzati verranno rimossi definitivamente.</p>
        <div className="grid grid-cols-2 gap-3 sm:flex sm:justify-end">
          <button onClick={onCancel} disabled={loading} autoFocus className="min-h-11 rounded-xl border border-line px-4 text-sm text-muted hover:bg-page disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-brand">Annulla</button>
          <button onClick={onConfirm} disabled={loading} className="min-h-11 rounded-xl bg-danger px-4 text-sm text-white hover:bg-red-600 disabled:opacity-60">{loading ? "Eliminazione…" : "Elimina"}</button>
        </div>
      </div>
    </div>
  );
}

export default function DocumentList({ initialDocuments, profiles, currentProfileId }: DocumentListProps) {
  const router = useRouter();
  const [hiddenIds, setHiddenIds] = useState<string[]>([]);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [movingId, setMovingId] = useState<string | null>(null);
  const [rowError, setRowError] = useState<Record<string, string>>({});
  const documents = initialDocuments.filter((doc) => !hiddenIds.includes(doc.id));

  async function handleDelete(id: string) {
    setDeleting(true);
    try {
      const res = await fetch(`/api/documents/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json() as { error?: string };
        setRowError((prev) => ({ ...prev, [id]: data.error ?? "Errore durante l'eliminazione." }));
      } else {
        setHiddenIds((prev) => [...prev, id]);
      }
    } catch {
      setRowError((prev) => ({ ...prev, [id]: "Errore di rete." }));
    } finally {
      setDeleting(false);
      setConfirmDeleteId(null);
    }
  }

  async function handleMove(id: string, profileId: string) {
    if (profileId === currentProfileId) return;
    setMovingId(id);
    setRowError((prev) => ({ ...prev, [id]: "" }));
    try {
      const res = await fetch(`/api/documents/${id}/profile`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileId }),
      });
      if (!res.ok) {
        const data = await res.json() as { error?: string };
        setRowError((prev) => ({ ...prev, [id]: data.error ?? "Impossibile spostare il documento." }));
        return;
      }
      setHiddenIds((prev) => [...prev, id]);
      router.refresh();
    } catch {
      setRowError((prev) => ({ ...prev, [id]: "Errore di rete." }));
    } finally {
      setMovingId(null);
    }
  }

  if (documents.length === 0) {
    return <p className="py-4 text-sm text-muted">Nessun documento in questo profilo.</p>;
  }

  return (
    <>
      {confirmDeleteId && <ConfirmDialog onConfirm={() => handleDelete(confirmDeleteId)} onCancel={() => setConfirmDeleteId(null)} loading={deleting} />}
      <div className="space-y-3">
        {documents.map((doc) => {
          const analysis = (doc.analysis ?? null) as Record<string, unknown> | null;
          const importo = analysis?.importo_totale ?? analysis?.stipendio_netto;
          const fornitore = analysis?.fornitore ?? analysis?.datore_lavoro;

          return (
            <Card key={doc.id} padding="sm" className="space-y-3">
              <Link href={`/analyze?id=${doc.id}`} className="block rounded-lg transition-opacity hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand">
                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                  <div className="min-w-0">
                    <div className="flex min-w-0 items-center gap-2">
                      <p className="truncate text-sm font-semibold text-ink">{DOCUMENTO_LABEL[doc.type] ?? doc.type}</p>
                      <Badge status={doc.status as AnalysisStatus} />
                    </div>
                    <p className="mt-0.5 truncate text-xs text-muted">{doc.fileName}</p>
                    {fornitore != null && <p className="mt-0.5 truncate text-xs text-muted">{String(fornitore)}</p>}
                  </div>
                  <div className="shrink-0 text-right">
                    {importo !== undefined && importo !== null && <p className="font-mono text-sm font-bold text-ink">{Number(importo).toLocaleString("it-IT", { style: "currency", currency: "EUR" })}</p>}
                    <p className="mt-0.5 text-xs text-muted">{new Date(doc.createdAt).toLocaleDateString("it-IT")}</p>
                  </div>
                </div>
              </Link>

              <div className="border-t border-line pt-3">
                <div className="grid gap-2 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center">
                  <label className="text-xs font-medium text-muted" htmlFor={`move-${doc.id}`}>Profilo</label>
                  <select
                    id={`move-${doc.id}`}
                    value={doc.profileId}
                    disabled={movingId === doc.id}
                    onChange={(e) => handleMove(doc.id, e.target.value)}
                    className="min-h-11 w-full rounded-xl border border-line bg-white px-3 text-sm text-ink disabled:opacity-50 sm:min-h-0 sm:w-auto sm:py-1.5 sm:text-xs"
                  >
                    {profiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.label}</option>)}
                  </select>
                  <button type="button" onClick={() => setConfirmDeleteId(doc.id)} className="min-h-11 justify-self-start rounded-lg px-1 text-sm font-medium text-danger hover:underline sm:min-h-0 sm:justify-self-end sm:text-xs">Elimina documento</button>
                </div>
              </div>
              {rowError[doc.id] && <p className="text-xs text-danger">{rowError[doc.id]}</p>}
            </Card>
          );
        })}
      </div>
    </>
  );
}
