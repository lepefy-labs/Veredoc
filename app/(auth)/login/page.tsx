"use client";

import { useState, FormEvent } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { TEXTS } from "@/lib/config/texts";

export default function LoginPage() {
  const router = useRouter();
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
        <h1 className="text-2xl font-bold text-center text-[#0F172A] mb-2">{TEXTS.auth.loginTitle}</h1>
        <p className="text-sm text-center text-[#64748B] mb-6">
          {TEXTS.auth.noAccount}{" "}
          <Link href="/register" className="text-[#1B4FD8] font-medium hover:underline">{TEXTS.auth.signUp}</Link>
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
                className="w-full rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B4FD8]"
              />
            </div>
            {error && <p className="text-sm text-[#EF4444]">{error}</p>}
            <Button type="submit" loading={loading} size="lg" className="w-full">
              {TEXTS.auth.loginButton}
            </Button>
          </form>
        </Card>
      </div>
    </main>
  );
}
