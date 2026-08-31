"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-line bg-white/95 px-4 pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-2 backdrop-blur sm:hidden">
      <nav aria-label="Navigazione app" className="mx-auto grid max-w-sm grid-cols-2 gap-2">
        <Link
          href="/dashboard"
          aria-current={pathname.startsWith("/dashboard") ? "page" : undefined}
          className={`flex min-h-12 items-center justify-center gap-2 rounded-xl text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ${pathname.startsWith("/dashboard") ? "bg-brand-soft text-brand" : "text-muted hover:bg-page hover:text-ink"}`}
        >
          Documenti
        </Link>
        <Link
          href="/analyze"
          aria-current={pathname.startsWith("/analyze") ? "page" : undefined}
          className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-brand text-sm font-semibold text-white transition-colors hover:bg-brand-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        >
          Analizza
        </Link>
      </nav>
    </div>
  );
}
