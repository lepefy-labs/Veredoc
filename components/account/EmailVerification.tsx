"use client";

import { useState } from "react";

type Status = "verified" | "unverified" | "legacy" | "unknown";

export default function EmailVerification({ status, canSend }: { status: Status; canSend: boolean }) {
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  if (status === "verified") {
    return <span className="inline-flex rounded-full bg-[#ECFDF5] px-2.5 py-0.5 text-xs font-semibold text-[#047857]">Confermata</span>;
  }
  if (status === "unknown") return null;

  async function send() {
    setState("sending");
    setMessage(null);
    try {
      const res = await fetch("/api/account/verify-email", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
      const data = await res.json().catch(() => null) as { error?: string; alreadyVerified?: boolean } | null;
      if (!res.ok) {
        setState("error");
        setMessage(data?.error ?? "Invio non riuscito.");
        return;
      }
      setState("sent");
      setMessage(data?.alreadyVerified ? "L'indirizzo risulta già confermato." : "Email inviata: apri il link entro 24 ore.");
    } catch {
      setState("error");
      setMessage("Errore di rete.");
    }
  }

  return (
    <div className="space-y-2">
      <span className="inline-flex rounded-full bg-[#FFFBEB] px-2.5 py-0.5 text-xs font-semibold text-[#B45309]">Da confermare</span>
      {status === "unverified" && (
        <p className="text-xs text-muted">Conferma l&apos;indirizzo per ricevere le email sull&apos;esito delle analisi.</p>
      )}
      {canSend && state !== "sent" && (
        <button
          type="button"
          onClick={send}
          disabled={state === "sending"}
          className="block text-sm font-medium text-brand hover:underline disabled:opacity-60"
        >
          {state === "sending" ? "Invio…" : "Invia email di conferma"}
        </button>
      )}
      {message && <p className={`text-xs ${state === "error" ? "text-danger" : "text-success-dark"}`} role="status">{message}</p>}
    </div>
  );
}
