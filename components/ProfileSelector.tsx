"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  resolveProfileId,
  type AnalysisProfileOption,
} from "@/lib/profiles/selection";

const KIND_LABELS: Record<string, string> = {
  PERSON: "Persona",
  HOUSEHOLD: "Casa / nucleo",
  BUSINESS: "Attività",
};

interface ProfileSelectorProps {
  initialProfileId: string | null;
  selectedProfileId: string | null;
  onSelect: (profileId: string) => void;
}

export default function ProfileSelector({
  initialProfileId,
  selectedProfileId,
  onSelect,
}: ProfileSelectorProps) {
  const [profiles, setProfiles] = useState<AnalysisProfileOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadProfiles() {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/profiles", { cache: "no-store" });
        if (!response.ok) throw new Error("profiles_fetch_failed");

        const data = await response.json() as { profiles?: AnalysisProfileOption[] };
        const nextProfiles = Array.isArray(data.profiles) ? data.profiles : [];
        if (cancelled) return;

        setProfiles(nextProfiles);
        const resolved = resolveProfileId(nextProfiles, initialProfileId);
        if (resolved && resolved !== selectedProfileId) onSelect(resolved);
      } catch {
        if (!cancelled) setError("Impossibile caricare i profili. Riprova tra poco.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadProfiles();
    return () => { cancelled = true; };
  }, [initialProfileId, onSelect, selectedProfileId]);

  if (loading) {
    return (
      <div className="rounded-xl border border-line bg-page px-4 py-4">
        <p className="text-sm font-semibold text-ink">Per chi è questo documento?</p>
        <p className="text-xs text-muted mt-1">Caricamento profili…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-4">
        <p className="text-sm font-semibold text-danger">Profili non disponibili</p>
        <p className="text-xs text-danger mt-1">{error}</p>
      </div>
    );
  }

  if (profiles.length === 0) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-4">
        <p className="text-sm font-semibold text-ink">Nessun profilo disponibile</p>
        <p className="text-xs text-muted mt-1">Crea un profilo dalla dashboard prima di caricare un documento.</p>
        <Link href="/dashboard" className="inline-flex mt-3 text-sm font-semibold text-brand hover:text-brand-dark">
          Vai alla dashboard →
        </Link>
      </div>
    );
  }

  const selected = profiles.find((profile) => profile.id === selectedProfileId) ?? null;

  return (
    <section className="rounded-xl border border-brand/20 bg-brand-soft/50 px-4 py-4 space-y-3" aria-labelledby="profile-selector-title">
      <div>
        <p id="profile-selector-title" className="text-sm font-semibold text-ink">Per chi è questo documento?</p>
        <p className="text-xs text-muted mt-1">Scegli il profilo corretto: storico e confronti resteranno separati dagli altri.</p>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <select
          value={selectedProfileId ?? ""}
          onChange={(event) => onSelect(event.target.value)}
          className="min-w-0 flex-1 rounded-lg border border-line bg-white px-3 py-2.5 text-sm font-medium text-ink focus-visible:outline-2 focus-visible:outline-brand"
          aria-label="Profilo del documento"
        >
          {profiles.map((profile) => (
            <option key={profile.id} value={profile.id}>
              {profile.label}{profile.isDefault ? " · predefinito" : ""}
            </option>
          ))}
        </select>

        <Link href="/dashboard" className="shrink-0 text-xs font-semibold text-brand hover:text-brand-dark">
          Gestisci profili
        </Link>
      </div>

      {selected && (
        <p className="text-xs text-muted">
          Selezionato: <span className="font-semibold text-ink">{selected.label}</span>
          {KIND_LABELS[selected.kind] ? ` · ${KIND_LABELS[selected.kind]}` : ""}
        </p>
      )}
    </section>
  );
}
