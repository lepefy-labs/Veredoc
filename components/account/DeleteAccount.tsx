"use client";

import { FormEvent, useState } from "react";
import { signOut } from "next-auth/react";
import Button from "@/components/ui/Button";
import { DELETE_CONFIRMATION } from "@/lib/account/credentials";

const inputClass = "w-full rounded-lg border border-line px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-danger";

export default function DeleteAccount() {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/account/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, confirmation }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null) as { error?: string } | null;
        setError(data?.error ?? "Eliminazione non riuscita.");
        return;
      }
      await signOut({ callbackUrl: "/arrivederci" });
    } catch {
      setError("Errore di rete. Riprova.");
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <Button variant="secondary" onClick={() => setOpen(true)} className="w-full border-red-200 text-danger hover:bg-red-50 sm:w-auto">
        Elimina account
      </Button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-lg border border-red-200 bg-red-50 p-4">
      <p className="text-sm font-semibold text-red-700">Eliminazione definitiva dell&apos;account</p>
      <p className="text-sm text-red-700">
        Verranno eliminati subito account, profili, documenti caricati e analisi. L&apos;operazione non si può annullare:
        se vuoi conservare una copia, scarica prima i tuoi dati.
      </p>
      <div>
        <label htmlFor="delete-password" className="mb-1 block text-sm font-medium text-ink">Password</label>
        <input id="delete-password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} className={inputClass} />
      </div>
      <div>
        <label htmlFor="delete-confirmation" className="mb-1 block text-sm font-medium text-ink">
          Scrivi <span className="font-mono font-semibold">{DELETE_CONFIRMATION}</span> per confermare
        </label>
        <input id="delete-confirmation" required autoComplete="off" value={confirmation} onChange={(e) => setConfirmation(e.target.value)} className={inputClass} />
      </div>
      {error && <p className="text-sm text-danger" role="alert">{error}</p>}
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button type="submit" variant="danger" loading={loading} disabled={confirmation !== DELETE_CONFIRMATION || !password}>
          Elimina definitivamente
        </Button>
        <Button type="button" variant="secondary" onClick={() => { setOpen(false); setError(null); }} disabled={loading}>Annulla</Button>
      </div>
    </form>
  );
}
