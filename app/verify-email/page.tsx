"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Card from "@/components/ui/Card";
import VeredocLogo from "@/components/ui/VeredocLogo";

type Result = { state: "loading" } | { state: "ok"; changed: boolean } | { state: "error"; message: string };

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const type = searchParams.get("type") === "change" ? "change" : "verify";
  const [result, setResult] = useState<Result>(() => token ? { state: "loading" } : { state: "error", message: "Link incompleto." });
  const started = useRef(false);

  useEffect(() => {
    // Il token è monouso: una sola richiesta anche con il doppio render di sviluppo.
    if (!token || started.current) return;
    started.current = true;
    fetch("/api/account/verify-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, type }),
    })
      .then(async (res) => {
        const data = await res.json().catch(() => null) as { error?: string; changed?: boolean } | null;
        setResult(res.ok ? { state: "ok", changed: data?.changed === true } : { state: "error", message: data?.error ?? "Conferma non riuscita." });
      })
      .catch(() => setResult({ state: "error", message: "Errore di rete. Riprova." }));
  }, [token, type]);

  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex justify-center">
          <Link href="/" aria-label="Torna alla home"><VeredocLogo variant="full" size="md" /></Link>
        </div>
        <Card>
          {result.state === "loading" && <p className="text-center text-sm text-muted">Conferma in corso…</p>}
          {result.state === "ok" && (
            <div className="space-y-4 text-center" role="status">
              <p className="text-base font-semibold text-ink">{result.changed ? "Indirizzo email aggiornato" : "Email confermata"}</p>
              <p className="text-sm text-muted">
                {result.changed
                  ? "Da ora accedi a Veredoc con il nuovo indirizzo."
                  : "Grazie! Ti avviseremo via email quando le tue analisi saranno pronte."}
              </p>
              <Link href="/account" className="inline-flex justify-center rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark">Vai al tuo account</Link>
            </div>
          )}
          {result.state === "error" && (
            <div className="space-y-4 text-center" role="alert">
              <p className="text-base font-semibold text-ink">Conferma non riuscita</p>
              <p className="text-sm text-muted">{result.message}</p>
              <Link href="/account" className="inline-flex justify-center rounded-lg border border-line px-4 py-2 text-sm font-medium text-ink hover:bg-page">Vai al tuo account</Link>
            </div>
          )}
        </Card>
      </div>
    </main>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<main className="min-h-screen flex items-center justify-center px-4"><p className="text-sm text-muted">Caricamento...</p></main>}>
      <VerifyEmailContent />
    </Suspense>
  );
}
