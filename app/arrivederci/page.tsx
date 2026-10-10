import type { Metadata } from "next";
import Link from "next/link";
import Card from "@/components/ui/Card";

export const metadata: Metadata = {
  title: "Account eliminato — Veredoc",
  robots: { index: false, follow: false },
};

export default function AccountDeletedPage() {
  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <Card className="w-full max-w-sm space-y-4 text-center">
        <p className="text-base font-semibold text-ink">Account eliminato</p>
        <p className="text-sm text-muted">
          Abbiamo eliminato il tuo account, i documenti caricati e le analisi. Ti abbiamo inviato un&apos;email di conferma.
        </p>
        <Link href="/" className="inline-flex justify-center rounded-lg border border-line px-4 py-2 text-sm font-medium text-ink hover:bg-page">
          Torna alla home
        </Link>
      </Card>
    </main>
  );
}
