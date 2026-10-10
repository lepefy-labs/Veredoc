"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import type { ProfileKind } from "@prisma/client";
import { PROFILE_LABEL_MAX_LENGTH } from "@/lib/profiles/validation";

interface ProfileRow {
  id: string;
  label: string;
  kind: ProfileKind;
  isDefault: boolean;
  documentCount: number;
}

const KIND_LABELS: Record<ProfileKind, string> = {
  PERSON: "Persona",
  HOUSEHOLD: "Casa / nucleo",
  BUSINESS: "Attività",
};

function Row({ profile }: { profile: ProfileRow }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [label, setLabel] = useState(profile.label);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function request(method: "PATCH" | "DELETE", body?: unknown) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/profiles/${profile.id}`, {
        method,
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null) as { error?: string } | null;
        setError(data?.error ?? "Operazione non riuscita.");
        return false;
      }
      router.refresh();
      return true;
    } catch {
      setError("Errore di rete.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function handleRename(event: FormEvent) {
    event.preventDefault();
    if (await request("PATCH", { label })) setEditing(false);
  }

  const canDelete = !profile.isDefault && profile.documentCount === 0;

  return (
    <li className="space-y-2 py-3">
      {editing ? (
        <form onSubmit={handleRename} className="flex flex-col gap-2 sm:flex-row">
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            maxLength={PROFILE_LABEL_MAX_LENGTH}
            aria-label={`Nuovo nome per ${profile.label}`}
            autoFocus
            className="min-h-11 flex-1 rounded-lg border border-line px-3 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-brand"
          />
          <div className="grid grid-cols-2 gap-2 sm:flex">
            <button type="submit" disabled={busy || !label.trim()} className="min-h-11 rounded-lg bg-brand px-4 text-sm font-semibold text-white disabled:opacity-50">Salva</button>
            <button type="button" onClick={() => { setEditing(false); setLabel(profile.label); setError(null); }} className="min-h-11 rounded-lg border border-line px-4 text-sm text-muted">Annulla</button>
          </div>
        </form>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-ink">
              {profile.label}
              {profile.isDefault && <span className="ml-2 text-xs font-normal text-brand">predefinito</span>}
            </p>
            <p className="text-xs text-muted">
              {KIND_LABELS[profile.kind]} · {profile.documentCount === 1 ? "1 documento" : `${profile.documentCount} documenti`}
            </p>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => setEditing(true)} className="min-h-10 rounded-lg border border-line px-3 text-sm text-ink hover:bg-page">Rinomina</button>
            {canDelete && (
              <button type="button" onClick={() => setConfirmDelete(true)} className="min-h-10 rounded-lg border border-red-200 px-3 text-sm text-danger hover:bg-red-50">Elimina</button>
            )}
          </div>
        </div>
      )}
      {confirmDelete && (
        <div className="flex flex-col gap-2 rounded-lg border border-red-200 bg-red-50 p-3 sm:flex-row sm:items-center sm:justify-between" role="alertdialog" aria-label={`Elimina ${profile.label}`}>
          <p className="text-sm text-red-700">Eliminare il profilo “{profile.label}”?</p>
          <div className="grid grid-cols-2 gap-2 sm:flex">
            <button type="button" disabled={busy} onClick={() => request("DELETE")} className="min-h-10 rounded-lg bg-danger px-3 text-sm font-semibold text-white disabled:opacity-50">Elimina</button>
            <button type="button" disabled={busy} onClick={() => setConfirmDelete(false)} className="min-h-10 rounded-lg border border-line bg-white px-3 text-sm text-muted">Annulla</button>
          </div>
        </div>
      )}
      {error && <p className="text-sm text-danger" role="alert">{error}</p>}
    </li>
  );
}

export default function ProfileSettings({ profiles }: { profiles: ProfileRow[] }) {
  return (
    <div className="space-y-2">
      <ul className="divide-y divide-line">
        {profiles.map((profile) => <Row key={`${profile.id}:${profile.label}`} profile={profile} />)}
      </ul>
      <p className="text-xs text-muted">Un profilo può essere eliminato solo se non contiene documenti. Il profilo predefinito non può essere eliminato.</p>
    </div>
  );
}
