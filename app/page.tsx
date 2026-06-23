import Link from "next/link";
import { TEXTS } from "@/lib/config/texts";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4">
      <div className="max-w-2xl w-full text-center space-y-8">
        <div>
          <h1 className="text-5xl font-bold tracking-tight text-[#1B4FD8]">Veredoc</h1>
          <p className="mt-3 text-xl text-[#0F172A] font-medium">{TEXTS.app.tagline}</p>
          <p className="mt-2 text-[#64748B]">{TEXTS.app.description}</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/analyze"
            className="inline-flex items-center justify-center px-6 py-3 bg-[#1B4FD8] text-white rounded-lg font-medium hover:bg-[#1640B0] transition-colors"
          >
            Analizza un documento
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center justify-center px-6 py-3 bg-white text-[#0F172A] border border-[#E2E8F0] rounded-lg font-medium hover:bg-[#F7F9FC] transition-colors"
          >
            Accedi
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-left mt-12">
          {[
            { title: "Carica", body: "PDF, JPG o PNG. Nessun inserimento manuale." },
            { title: "Analisi AI", body: "Claude legge e spiega ogni voce in italiano semplice." },
            { title: "Confronto", body: "Vedi se stai pagando troppo rispetto al mercato." },
          ].map((item) => (
            <div key={item.title} className="bg-white rounded-xl border border-[#E2E8F0] p-5">
              <p className="font-semibold text-[#1B4FD8] mb-1">{item.title}</p>
              <p className="text-sm text-[#64748B]">{item.body}</p>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
