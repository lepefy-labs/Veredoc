import Link from "next/link";
import { appNavigation } from "@/components/layout/app-navigation";

export default function MobileBottomNav({ pathname, praticheAvailable }: { pathname: string; praticheAvailable: boolean }) {
  return (
    <div className="app-bottom-bar fixed inset-x-0 bottom-0 z-50 border-t border-line bg-white/95 px-2 pb-[max(env(safe-area-inset-bottom),0.65rem)] pt-2 backdrop-blur sm:hidden">
      <nav aria-label="Navigazione app" className={`mx-auto grid max-w-md gap-1 ${praticheAvailable ? "grid-cols-4" : "grid-cols-3"}`}>
        {appNavigation(pathname, praticheAvailable).map(({ href, label, current }) => (
          <Link key={href} href={href} aria-current={current ? "page" : undefined}
            className={`flex min-h-12 items-center justify-center rounded-lg px-1 text-center text-xs leading-tight font-semibold focus-visible:outline-2 focus-visible:outline-brand ${current ? "bg-brand-soft text-brand" : "text-muted hover:bg-page hover:text-ink"}`}>
            {label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
