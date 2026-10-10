"use client";

import { FormEvent, useState } from "react";
import Button from "@/components/ui/Button";
import { PASSWORD_MIN_LENGTH } from "@/lib/account/credentials";

const inputClass = "w-full rounded-lg border border-line px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-brand";

export default function PasswordChangeForm() {
  const [open, setOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSuccess(false);
    if (newPassword !== confirmPassword) {
      setError("Le due nuove password non coincidono.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/account/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null) as { error?: string } | null;
        setError(data?.error ?? "Non è stato possibile aggiornare la password.");
        return;
      }
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setSuccess(true);
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
        {success && <p className="text-sm text-success-dark" role="status">Password aggiornata.</p>}
        <Button variant="secondary" onClick={() => setOpen(true)} className="w-full sm:w-auto">Cambia password</Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label htmlFor="current-password" className="mb-1 block text-sm font-medium text-ink">Password attuale</label>
        <input id="current-password" type="password" autoComplete="current-password" required value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className={inputClass} />
      </div>
      <div>
        <label htmlFor="new-password" className="mb-1 block text-sm font-medium text-ink">Nuova password</label>
        <input id="new-password" type="password" autoComplete="new-password" required minLength={PASSWORD_MIN_LENGTH} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className={inputClass} />
        <p className="mt-1 text-xs text-muted">Almeno {PASSWORD_MIN_LENGTH} caratteri.</p>
      </div>
      <div>
        <label htmlFor="confirm-password" className="mb-1 block text-sm font-medium text-ink">Conferma nuova password</label>
        <input id="confirm-password" type="password" autoComplete="new-password" required minLength={PASSWORD_MIN_LENGTH} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className={inputClass} />
      </div>
      {error && <p className="text-sm text-danger" role="alert">{error}</p>}
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button type="submit" loading={loading}>Salva nuova password</Button>
        <Button type="button" variant="secondary" onClick={() => { setOpen(false); setError(null); }} disabled={loading}>Annulla</Button>
      </div>
    </form>
  );
}
