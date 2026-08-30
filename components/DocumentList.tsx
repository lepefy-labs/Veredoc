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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onCancel}>
      <div role="dialog" aria-modal="true" aria-labelledby="confirm-delete-title" onClick={(e) => e.stopPropagation()} className="bg-white rounded-xl shadow-lg p-6 max-w-sm w-full mx-4 space-y-4">
        <p id="confirm-delete-title" className="text-sm text-ink">Sei sicuro di voler eliminare questo documento? I dati analizzati verranno rimossi definitivamente.</p>
        <div className="flex gap-3 justify-end">
          <button onClick={onCancel} disabled={loading} autoFocus className="px-4 py-2 text-sm text-muted border border-line rounded-lg hover:bg-page disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-brand">Annulla</button>
          <button onClick={onConfirm} disabled={loading} className="px-4 py-2 text-sm text-white bg-danger rounded-lg hover:bg-red-600 disabled:opacity-60">{loading ? "Eliminazione…" : "Elimina"}</button>
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
    return <p className="text-sm text-muted py-4">Nessun documento in questo profilo.</p>;
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
              <div className="flex items-start gap-4">
                <Link href={`/analyze?id=${doc.id}`} className="flex-1 min-w-0 hover:opacity-80">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-ink truncate">{DOCUMENTO_LABEL[doc.type] ?? doc.type}</p>
                    <Badge status={doc.status as AnalysisStatus} />
                  </div>
                  <p className="text-xs text-muted mt-0.5 truncate">{doc.fileName}</p>
                  {fornitore != null && <p className="text-xs text-muted">{String(fornitore)}</p>}
                </Link>
                <div className="text-right shrink-0">
                  {importo !== undefined && importo !== null && <p className="font-mono text-sm font-bold text-ink">{Number(importo).toLocaleString("it-IT", { style: "currency", currency: "EUR" })}</p>}
                  <p className="text-xs text-muted">{new Date(doc.createdAt).toLocaleDateString("it-IT")}</p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center gap-2 pt-2 border-t border-line">
                <label className="text-xs text-muted" htmlFor={`move-${doc.id}`}>Profilo</label>
                <select
                  id={`move-${doc.id}`}
                  value={doc.profileId}
                  disabled={movingId === doc.id}
                  onChange={(e) => handleMove(doc.id, e.target.value)}
                  className="rounded-md border border-line bg-white px-2 py-1.5 text-xs text-ink disabled:opacity-50"
                >
                  {profiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.label}</option>)}
                </select>
                <button type="button" onClick={() => setConfirmDeleteId(doc.id)} className="sm:ml-auto text-xs text-danger hover:underline">Elimina</button>
              </div>
              {rowError[doc.id] && <p className="text-xs text-danger">{rowError[doc.id]}</p>}
            </Card>
          );
        })}
      </div>
    </>
  );
}
