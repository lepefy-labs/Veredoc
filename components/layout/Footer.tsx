import Link from "next/link";
import CurrentYear from "./CurrentYear";

export default function Footer() {
  return (
    <footer className="border-t border-line bg-page text-muted text-sm">
      <div className="max-w-5xl mx-auto px-4 py-6 flex flex-col items-center gap-2 text-center">
        <nav className="flex flex-wrap justify-center gap-x-3 gap-y-1">
          <Link href="/privacy" className="hover:text-brand transition-colors">Privacy Policy</Link>
          <span aria-hidden="true">·</span>
          <Link href="/privacy" className="hover:text-brand transition-colors">Cookie Policy</Link>
          <span aria-hidden="true">·</span>
          <Link href="/termini" className="hover:text-brand transition-colors">Termini di servizio</Link>
        </nav>
        <p>Veredoc · ciao@veredoc.it · © <CurrentYear /> Tutti i diritti riservati</p>
      </div>
    </footer>
  );
}
