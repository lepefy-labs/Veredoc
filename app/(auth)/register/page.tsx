"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { TEXTS } from "@/lib/config/texts";
import VeredocLogo from "@/components/ui/VeredocLogo";

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [consenso, setConsenso] = useState(false);
  const [consensoError, setConsensoError] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!consenso) {
      setConsensoError(true);
      return;
    }
    setConsensoError(false);
    setError(null);
    setLoading(true);

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    setLoading(false);

    if (!res.ok) {
      const data = await res.json() as { error: string };
      setError(data.error ?? "Errore durante la registrazione.");
      return;
    }

    router.push("/login?registered=1");
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-6">
          <Link href="/" aria-label="Torna alla home">
            <VeredocLogo variant="full" size="md" />
          </Link>
        </div>
        <p className="text-sm text-center text-muted mb-6">
          {TEXTS.auth.hasAccount}{" "}
          <Link href="/login" className="text-brand font-medium hover:underline">{TEXTS.auth.signIn}</Link>
        </p>

        <Card>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="register-email" className="block text-sm font-medium text-ink mb-1">{TEXTS.auth.emailLabel}</label>
              <input
                id="register-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="w-full rounded-lg border border-line px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
              />
            </div>
            <div>
              <label htmlFor="register-password" className="block text-sm font-medium text-ink mb-1">{TEXTS.auth.passwordLabel}</label>
              <input
                id="register-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
                aria-describedby="password-hint"
                className="w-full rounded-lg border border-line px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
              />
              <p id="password-hint" className="text-xs text-muted mt-1">Minimo 8 caratteri.</p>
            </div>
            <div className="space-y-1">
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={consenso}
                  onChange={(e) => {
                    setConsenso(e.target.checked);
                    if (e.target.checked) setConsensoError(false);
                  }}
                  className="mt-0.5 accent-brand"
                />
                <span className="text-sm text-ink">
                  Ho letto e accetto la{" "}
                  <Link
                    href="/privacy"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-brand hover:underline"
                  >
                    Privacy Policy
                  </Link>{" "}
                  e i{" "}
                  <Link
                    href="/termini"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-brand hover:underline"
                  >
                    Termini e Condizioni
                  </Link>
                </span>
              </label>
              {consensoError && (
                <p className="text-sm text-danger">
                  Devi accettare Privacy Policy e Termini per registrarti.
                </p>
              )}
            </div>
            {error && <p className="text-sm text-danger">{error}</p>}
            <Button type="submit" loading={loading} size="lg" className="w-full">
              {TEXTS.auth.registerButton}
            </Button>
          </form>
        </Card>
      </div>
    </main>
  );
}
