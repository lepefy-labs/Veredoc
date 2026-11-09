"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

type Profile = { id: string; label: string; kind: string };

export default function StartPractice({ slug, profiles }: { slug: string; profiles: Profile[] }) {
  const router = useRouter();
  const [profileId, setProfileId] = useState(profiles[0]?.id ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const requestKey = useRef<string | null>(null);
  async function start() {
    setBusy(true); setError("");
    try {
      requestKey.current ??= crypto.randomUUID();
      const response = await fetch("/api/pratiche/cases", { method: "POST", headers: { "Content-Type": "application/json", "Idempotency-Key": requestKey.current }, body: JSON.stringify({ slug, profileId }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Non è stato possibile avviare la pratica.");
      router.push(`/pratiche/caso/${data.id}`);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Errore di rete."); setBusy(false); }
  }
  return <div className="space-y-3">
    <label htmlFor="practice-profile" className="block text-sm font-semibold">Profilo</label>
    <select id="practice-profile" value={profileId} onChange={(event) => { setProfileId(event.target.value); requestKey.current = null; }} className="w-full rounded-lg border border-line bg-white p-3">{profiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.label}</option>)}</select>
    <button type="button" onClick={start} disabled={!profileId || busy} className="min-h-12 w-full rounded-xl bg-brand px-5 font-semibold text-white disabled:opacity-50 sm:w-auto">{busy ? "Avvio..." : "Inizia la pratica"}</button>
    {error && <p role="alert" className="text-sm text-danger">{error}</p>}
  </div>;
}
