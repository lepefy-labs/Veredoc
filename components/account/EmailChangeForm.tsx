"use client";

import { FormEvent, useState } from "react";
import Button from "@/components/ui/Button";

const inputClass = "w-full rounded-lg border border-line px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-brand";

export default function EmailChangeForm() {
  const [open, setOpen] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/account/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newEmail, password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null) as { error?: string } | null;
        setError(data?.error ?? "Richiesta non riuscita.");
        return;
      }
      setSentTo(newEmail.trim());
      setNewEmail("");
      setPassword("");
      setOpen(false);
    } catch {
      setError("Errore di rete. Riprova.");
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <div className="space-y-2">
        {sentTo && (
          <p className="text-sm text-success-dark" role="status">
            Se l&apos;indirizzo è disponibile, abbiamo inviato a {sentTo} un link di conferma valido 24 ore. Fino alla conferma resta attivo l&apos;indirizzo attuale.
          </p>
        )}
        <Button variant="secondary" onClick={() => setOpen(true)} className="w-full sm:w-auto">Cambia email</Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label htmlFor="new-email" className="mb-1 block text-sm font-medium text-ink">Nuovo indirizzo email</label>
        <input id="new-email" type="email" autoComplete="email" required value={newEmail} onChange={(e) => setNewEmail(e.target.value)} className={inputClass} />
      </div>
      <div>
        <label htmlFor="email-change-password" className="mb-1 block text-sm font-medium text-ink">Password attuale</label>
        <input id="email-change-password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} className={inputClass} />
      </div>
      {error && <p className="text-sm text-danger" role="alert">{error}</p>}
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button type="submit" loading={loading}>Invia link di conferma</Button>
        <Button type="button" variant="secondary" onClick={() => { setOpen(false); setError(null); }} disabled={loading}>Annulla</Button>
      </div>
    </form>
  );
}
