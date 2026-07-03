"use client";

import { Suspense, useState, FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { TEXTS } from "@/lib/config/texts";
import VeredocLogo from "@/components/ui/VeredocLogo";

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [invalidToken, setInvalidToken] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError(TEXTS.resetPassword.passwordMismatch);
      return;
    }

    setLoading(true);

    const res = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    });

    setLoading(false);

    if (!res.ok) {
      const data = await res.json() as { error: string };
      setError(data.error ?? TEXTS.resetPassword.errors.generic);
      setInvalidToken(true);
      return;
    }

    setSuccess(true);
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-6">
          <Link href="/" aria-label="Torna alla home">
            <VeredocLogo variant="full" size="md" />
          </Link>
        </div>

        <Card>
          {!token ? (
            <div role="alert">
              <h1 className="text-lg font-semibold text-ink mb-2">{TEXTS.resetPassword.invalidTokenTitle}</h1>
              <p className="text-sm text-muted mb-4">{TEXTS.resetPassword.missingToken}</p>
              <Link href="/forgot-password" className="text-sm text-brand font-medium hover:underline">
                {TEXTS.resetPassword.requestNewLink}
              </Link>
            </div>
          ) : success ? (
            <div role="status">
              <h1 className="text-lg font-semibold text-ink mb-2">{TEXTS.resetPassword.title}</h1>
              <p className="text-sm text-muted mb-4">{TEXTS.resetPassword.success}</p>
              <Link href="/login" className="text-sm text-brand font-medium hover:underline">
                {TEXTS.resetPassword.goToLogin}
              </Link>
            </div>
          ) : invalidToken ? (
            <div role="alert">
              <h1 className="text-lg font-semibold text-ink mb-2">{TEXTS.resetPassword.invalidTokenTitle}</h1>
              <p className="text-sm text-muted mb-4">{TEXTS.resetPassword.invalidTokenSubtitle}</p>
              <Link href="/forgot-password" className="text-sm text-brand font-medium hover:underline">
                {TEXTS.resetPassword.requestNewLink}
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <h1 className="text-lg font-semibold text-ink mb-1">{TEXTS.resetPassword.title}</h1>
                <p className="text-sm text-muted mb-4">{TEXTS.resetPassword.subtitle}</p>
              </div>
              <div>
                <label htmlFor="reset-password" className="block text-sm font-medium text-ink mb-1">
                  {TEXTS.resetPassword.passwordLabel}
                </label>
                <input
                  id="reset-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  autoComplete="new-password"
                  aria-describedby="reset-password-hint"
                  className="w-full rounded-lg border border-line px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                />
                <p id="reset-password-hint" className="text-xs text-muted mt-1">{TEXTS.resetPassword.passwordHint}</p>
              </div>
              <div>
                <label htmlFor="reset-confirm-password" className="block text-sm font-medium text-ink mb-1">
                  {TEXTS.resetPassword.confirmPasswordLabel}
                </label>
                <input
                  id="reset-confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={8}
                  autoComplete="new-password"
                  className="w-full rounded-lg border border-line px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                />
              </div>
              {error && <p className="text-sm text-danger" role="alert">{error}</p>}
              <Button type="submit" loading={loading} size="lg" className="w-full">
                {TEXTS.resetPassword.submitButton}
              </Button>
            </form>
          )}
        </Card>
      </div>
    </main>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen flex items-center justify-center px-4">
          <p className="text-sm text-muted">Caricamento...</p>
        </main>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  );
}
