"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { appNavigation } from "@/components/layout/app-navigation";
import MobileBottomNav from "@/components/layout/MobileBottomNav";
import VeredocLogo from "@/components/ui/VeredocLogo";

const linkClass = "inline-flex min-h-11 items-center rounded-md px-2 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-brand";

export default function Navbar({ praticheAvailable = false }: { praticheAvailable?: boolean }) {
  const { data: session } = useSession();
  const pathname = usePathname();

  return (
    <>
      <nav aria-label="Principale" className="sticky top-0 z-50 flex items-center justify-between gap-2 border-b border-line bg-white/95 px-3 py-2 backdrop-blur sm:px-6">
        <Link href={session ? "/dashboard" : "/"} className="inline-flex min-h-11 shrink-0 items-center rounded-md focus-visible:outline-2 focus-visible:outline-brand">
          <VeredocLogo variant="full" size="sm" />
        </Link>
        {session ? (
          <div className="hidden items-center gap-1 sm:flex lg:gap-3">
            {appNavigation(pathname, praticheAvailable).map(({ href, label, current }) => (
              <Link key={href} href={href} aria-current={current ? "page" : undefined}
                className={`${linkClass} ${current ? "bg-brand-soft text-brand" : "text-ink hover:text-brand"}`}>
                {label}
              </Link>
            ))}
            <button type="button" onClick={() => signOut({ callbackUrl: "/" })} className={`${linkClass} cursor-pointer text-muted hover:text-ink`}>Esci</button>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-end gap-x-1 sm:gap-x-3">
            {praticheAvailable && <Link href="/guide" className={`${linkClass} text-brand hover:underline`}>Guide</Link>}
            <Link href="/login" className={`${linkClass} text-ink hover:text-brand`}>Accedi</Link>
            <Link href="/register" className={`${linkClass} bg-brand text-white hover:bg-brand-dark focus-visible:outline-offset-2`}>Registrati</Link>
          </div>
        )}
      </nav>
      {session && <MobileBottomNav pathname={pathname} praticheAvailable={praticheAvailable} />}
    </>
  );
}
