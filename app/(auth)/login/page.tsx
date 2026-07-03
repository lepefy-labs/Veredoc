"use client";

import { Suspense, useState, FormEvent } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { TEXTS } from "@/lib/config/texts";
import VeredocLogo from "@/components/ui/VeredocLogo";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const justRegistered = searchParams.get("registered") === "1";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      setError("Email o password non corretti.");
      return;
    }

    router.push("/dashboard");
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
          {TEXTS.auth.noAccount}{" "}
          <Link href="/register" className="text-brand font-medium hover:underline">{TEXTS.auth.signUp}</Link>
        </p>

        {justRegistered && (
          <div className="mb-4 rounded-lg border border-[#86EFAC] bg-[#F0FDF4] px-4 py-3" role="status">
            <p className="text-sm font-medium text-[#166534]">
              Account creato! Accedi con le credenziali appena scelte.
            </p>
          </div>
        )}

        <Card>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="login-email" className="block text-sm font-medium text-ink mb-1">{TEXTS.auth.emailLabel}</label>
              <input
                id="login-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="w-full rounded-lg border border-line px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
              />
            </div>
            <div>
              <label htmlFor="login-password" className="block text-sm font-medium text-ink mb-1">{TEXTS.auth.passwordLabel}</label>
              <input
                id="login-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="w-full rounded-lg border border-line px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
              />
            </div>
            {error && <p className="text-sm text-danger" role="alert">{error}</p>}
            <Button type="submit" loading={loading} size="lg" className="w-full">
              {TEXTS.auth.loginButton}
            </Button>
          </form>
        </Card>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen flex items-center justify-center px-4">
          <p className="text-sm text-muted">Caricamento...</p>
        </main>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
