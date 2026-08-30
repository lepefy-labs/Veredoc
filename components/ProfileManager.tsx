"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { ProfileKind } from "@prisma/client";

export interface ProfileOption {
  id: string;
  label: string;
  kind: ProfileKind;
  isDefault: boolean;
}

const KIND_LABELS: Record<ProfileKind, string> = {
  PERSON: "Persona",
  HOUSEHOLD: "Casa / nucleo",
  BUSINESS: "Attività",
};

export default function ProfileManager({ profiles }: { profiles: ProfileOption[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState("");
  const [kind, setKind] = useState<ProfileKind>(ProfileKind.PERSON);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!label.trim()) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/profiles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: label.trim(), kind }),
      });
      if (!res.ok) {
        const data = await res.json() as { error?: string };
        setError(data.error ?? "Impossibile creare il profilo.");
        return;
      }
      setLabel("");
      setKind(ProfileKind.PERSON);
      setOpen(false);
      router.refresh();
    } catch {
      setError("Errore di rete.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-xl border border-line bg-white p-5 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-ink">Profili di analisi</p>
          <p className="text-sm text-muted mt-1">Separa i documenti tuoi, dei familiari, delle case o di un&apos;attività. I confronti storici restano dentro lo stesso profilo.</p>
        </div>
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="shrink-0 inline-flex items-center justify-center px-4 py-2 rounded-lg border border-brand text-brand text-sm font-semibold hover:bg-brand-soft"
        >
          {open ? "Chiudi" : "+ Nuovo profilo"}
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {profiles.map((profile) => (
          <span key={profile.id} className="inline-flex items-center gap-2 rounded-full bg-page border border-line px-3 py-1.5 text-xs text-ink">
            <span className="font-semibold">{profile.label}</span>
            <span className="text-muted">{KIND_LABELS[profile.kind]}</span>
            {profile.isDefault && <span className="text-brand">predefinito</span>}
          </span>
        ))}
      </div>

      {open && (
        <form onSubmit={handleSubmit} className="grid sm:grid-cols-[1fr_180px_auto] gap-3 pt-1">
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            maxLength={60}
            placeholder="Es. Mamma, Casa Milano, Negozio"
            className="w-full rounded-lg border border-line px-3 py-2 text-sm text-ink focus-visible:outline-2 focus-visible:outline-brand"
            aria-label="Nome profilo"
          />
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value as ProfileKind)}
            className="rounded-lg border border-line px-3 py-2 text-sm text-ink bg-white focus-visible:outline-2 focus-visible:outline-brand"
            aria-label="Tipo profilo"
          >
            {Object.entries(KIND_LABELS).map(([value, text]) => <option key={value} value={value}>{text}</option>)}
          </select>
          <button
            type="submit"
            disabled={loading || !label.trim()}
            className="rounded-lg bg-brand text-white px-4 py-2 text-sm font-semibold disabled:opacity-50"
          >
            {loading ? "Creazione…" : "Crea"}
          </button>
          {error && <p className="sm:col-span-3 text-sm text-danger">{error}</p>}
        </form>
      )}
    </section>
  );
}
