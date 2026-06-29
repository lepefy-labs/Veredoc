import Link from "next/link";
import CurrentYear from "./CurrentYear";

export default function Footer() {
  return (
    <footer className="border-t border-[#E2E8F0] bg-[#F7F9FC] text-[#64748B] text-sm">
      <div className="max-w-5xl mx-auto px-4 py-6 flex flex-col items-center gap-2 text-center">
        <nav className="flex flex-wrap justify-center gap-x-3 gap-y-1">
          <Link href="/privacy" className="hover:text-[#1B4FD8] transition-colors">Privacy Policy</Link>
          <span aria-hidden="true">·</span>
          <Link href="/privacy" className="hover:text-[#1B4FD8] transition-colors">Cookie Policy</Link>
          <span aria-hidden="true">·</span>
          <Link href="/termini" className="hover:text-[#1B4FD8] transition-colors">Termini di servizio</Link>
        </nav>
        <p>Veredoc · ciao@veredoc.it · © <CurrentYear /> Tutti i diritti riservati</p>
      </div>
    </footer>
  );
}
