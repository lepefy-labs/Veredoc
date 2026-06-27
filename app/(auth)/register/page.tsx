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

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
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
          <VeredocLogo variant="full" size="md" />
        </div>
        <p className="text-sm text-center text-[#64748B] mb-6">
          {TEXTS.auth.hasAccount}{" "}
          <Link href="/login" className="text-[#1B4FD8] font-medium hover:underline">{TEXTS.auth.signIn}</Link>
        </p>

        <Card>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#0F172A] mb-1">{TEXTS.auth.emailLabel}</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B4FD8]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#0F172A] mb-1">{TEXTS.auth.passwordLabel}</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                className="w-full rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B4FD8]"
              />
            </div>
            {error && <p className="text-sm text-[#EF4444]">{error}</p>}
            <Button type="submit" loading={loading} size="lg" className="w-full">
              {TEXTS.auth.registerButton}
            </Button>
          </form>
        </Card>
      </div>
    </main>
  );
}
