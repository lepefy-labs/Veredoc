"use client";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import VeredocLogo from "@/components/ui/VeredocLogo";

export default function Navbar() {
  const { data: session } = useSession();
  return (
    <nav aria-label="Principale" className="bg-white border-b border-line px-4 sm:px-6 py-3 flex items-center justify-between gap-3 sticky top-0 z-50">
      <Link href={session ? "/dashboard" : "/"} onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
        <VeredocLogo variant="full" size="sm" />
      </Link>
      <div className="flex items-center gap-4 text-sm font-medium">
        {session ? (
          <>
            <Link
              href="/dashboard"
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              className="text-ink hover:text-brand transition-colors"
            >
              Dashboard
            </Link>
            <Link href="/analyze" className="text-ink hover:text-brand transition-colors">
              Nuova analisi
            </Link>
            <span className={`hidden sm:inline-flex text-xs font-semibold px-2 py-0.5 rounded-full ${
              session.user?.plan === "PRO"
                ? "bg-success text-white"
                : "bg-line text-muted"
            }`}>
              {session.user?.plan ?? "FREE"}
            </span>
            <button
              onClick={() => signOut({ callbackUrl: "/" })}
              className="text-muted hover:text-ink transition-colors cursor-pointer"
            >
              Esci
            </button>
          </>
        ) : (
          <>
            <Link href="/login" className="text-ink hover:text-brand transition-colors">
              Accedi
            </Link>
            <Link
              href="/register"
              className="px-4 py-1.5 bg-brand text-white rounded-lg hover:bg-brand-dark transition-colors"
            >
              Registrati
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}
