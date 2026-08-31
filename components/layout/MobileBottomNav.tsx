"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function MobileBottomNav() {
  const pathname = usePathname();
  const dashboardActive = pathname.startsWith("/dashboard");
  const analyzeActive = pathname.startsWith("/analyze");

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-line bg-white/95 px-3 pb-[max(env(safe-area-inset-bottom),0.65rem)] pt-2 backdrop-blur sm:hidden">
      <nav aria-label="Navigazione app" className="mx-auto grid max-w-sm grid-cols-2 gap-2">
        <Link
          href="/dashboard"
          aria-current={dashboardActive ? "page" : undefined}
          className={`flex min-h-13 items-center justify-center gap-2 rounded-xl px-3 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ${dashboardActive ? "bg-brand-soft text-brand" : "text-muted hover:bg-page hover:text-ink"}`}
        >
          <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 4.5h14a1.5 1.5 0 011.5 1.5v12a1.5 1.5 0 01-1.5 1.5H5A1.5 1.5 0 013.5 18V6A1.5 1.5 0 015 4.5zM7 8h10M7 12h7M7 16h5" />
          </svg>
          Documenti
        </Link>
        <Link
          href="/analyze"
          aria-current={analyzeActive ? "page" : undefined}
          className={`flex min-h-13 items-center justify-center gap-2 rounded-xl px-3 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ${analyzeActive ? "bg-brand text-white" : "bg-brand text-white shadow-sm hover:bg-brand-dark"}`}
        >
          <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14M5 12h14" />
          </svg>
          Analizza
        </Link>
      </nav>
    </div>
  );
}
