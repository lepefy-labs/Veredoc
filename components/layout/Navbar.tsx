"use client";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import VeredocLogo from "@/components/ui/VeredocLogo";

export default function Navbar() {
  const { data: session } = useSession();
  return (
    <nav className="bg-white border-b border-[#E2E8F0] px-6 py-3 flex items-center justify-between sticky top-0 z-50">
      <Link href="/" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
        <VeredocLogo variant="full" size="sm" />
      </Link>
      <div className="flex items-center gap-4 text-sm font-medium">
        {session ? (
          <>
            <Link
              href="/dashboard"
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              className="text-[#0F172A] hover:text-[#1B4FD8] transition-colors"
            >
              Dashboard
            </Link>
            <Link href="/analyze" className="text-[#0F172A] hover:text-[#1B4FD8] transition-colors">
              Nuova analisi
            </Link>
            <button
              onClick={() => signOut({ callbackUrl: "/" })}
              className="text-[#64748B] hover:text-[#0F172A] transition-colors cursor-pointer"
            >
              Esci
            </button>
          </>
        ) : (
          <>
            <Link href="/login" className="text-[#0F172A] hover:text-[#1B4FD8] transition-colors">
              Accedi
            </Link>
            <Link
              href="/register"
              className="px-4 py-1.5 bg-[#1B4FD8] text-white rounded-lg hover:bg-[#1640B0] transition-colors"
            >
              Registrati
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}
