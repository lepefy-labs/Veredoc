"use client";

import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import MobileBottomNav from "@/components/layout/MobileBottomNav";
import VeredocLogo from "@/components/ui/VeredocLogo";

export default function Navbar() {
  const { data: session } = useSession();

  return (
    <>
      <nav aria-label="Principale" className="sticky top-0 z-50 flex items-center justify-between gap-3 border-b border-line bg-white/95 px-4 py-3 backdrop-blur sm:px-6">
        <Link href={session ? "/dashboard" : "/"} onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
          <VeredocLogo variant="full" size="sm" />
        </Link>

        {session ? (
          <>
            <div className="hidden items-center gap-4 text-sm font-medium sm:flex">
              <Link
                href="/dashboard"
                onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
                className="text-ink transition-colors hover:text-brand"
              >
                Dashboard
              </Link>
              <Link href="/analyze" className="text-ink transition-colors hover:text-brand">
                Nuova analisi
              </Link>
              <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${session.user?.plan === "PRO" ? "bg-success text-white" : "bg-line text-muted"}`}>
                {session.user?.plan ?? "FREE"}
              </span>
              <button
                onClick={() => signOut({ callbackUrl: "/" })}
                className="cursor-pointer text-muted transition-colors hover:text-ink"
              >
                Esci
              </button>
            </div>
            <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold sm:hidden ${session.user?.plan === "PRO" ? "bg-success text-white" : "bg-line text-muted"}`}>
              {session.user?.plan ?? "FREE"}
            </span>
          </>
        ) : (
          <div className="flex items-center gap-2 text-sm font-medium sm:gap-4">
            <Link href="/login" className="text-ink transition-colors hover:text-brand">
              Accedi
            </Link>
            <Link href="/register" className="rounded-lg bg-brand px-3 py-1.5 text-white transition-colors hover:bg-brand-dark sm:px-4">
              Registrati
            </Link>
          </div>
        )}
      </nav>

      {session && <MobileBottomNav />}
    </>
  );
}
