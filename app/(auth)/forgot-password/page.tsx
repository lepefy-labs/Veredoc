"use client";

import { useState, FormEvent } from "react";
import Link from "next/link";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { TEXTS } from "@/lib/config/texts";
import VeredocLogo from "@/components/ui/VeredocLogo";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);

    await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    setLoading(false);
    setSubmitted(true);
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
          {submitted ? (
            <div role="status">
              <h1 className="text-lg font-semibold text-ink mb-2">{TEXTS.forgotPassword.title}</h1>
              <p className="text-sm text-muted">{TEXTS.forgotPassword.confirmation}</p>
              <Link href="/login" className="block mt-4 text-sm text-brand font-medium hover:underline">
                {TEXTS.forgotPassword.backToLogin}
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <h1 className="text-lg font-semibold text-ink mb-1">{TEXTS.forgotPassword.title}</h1>
                <p className="text-sm text-muted mb-4">{TEXTS.forgotPassword.subtitle}</p>
                <label htmlFor="forgot-email" className="block text-sm font-medium text-ink mb-1">
                  {TEXTS.forgotPassword.emailLabel}
                </label>
                <input
                  id="forgot-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  className="w-full rounded-lg border border-line px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                />
              </div>
              <Button type="submit" loading={loading} size="lg" className="w-full">
                {TEXTS.forgotPassword.submitButton}
              </Button>
              <Link href="/login" className="block text-center text-sm text-brand font-medium hover:underline">
                {TEXTS.forgotPassword.backToLogin}
              </Link>
            </form>
          )}
        </Card>
      </div>
    </main>
  );
}
