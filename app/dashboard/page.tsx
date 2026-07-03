import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import Button from "@/components/ui/Button";
import DocumentList from "@/components/DocumentList";
import { TEXTS } from "@/lib/config/texts";
import { ANALYSIS_LIMITS } from "@/lib/config/constants";
import { AnalysisStatus, UserPlan } from "@prisma/client";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const startOfMonth = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1));
  const [documents, usedThisMonth] = await Promise.all([
    prisma.document.findMany({
      where: {
        userId: session.user.id,
        status: { not: AnalysisStatus.DELETED },
      },
      orderBy: { createdAt: "desc" },
    }),
    // Stessa logica di conteggio quota dell'endpoint di upload
    prisma.document.count({
      where: {
        userId: session.user.id,
        status: { in: [AnalysisStatus.DONE, AnalysisStatus.ERROR, AnalysisStatus.DELETED] },
        createdAt: { gte: startOfMonth },
      },
    }),
  ]);

  const plan = session.user.plan === "PRO" ? UserPlan.PRO : UserPlan.FREE;
  const monthlyLimit = ANALYSIS_LIMITS[plan];
  const quotaPct = Math.min(100, Math.round((usedThisMonth / monthlyLimit) * 100));

  return (
    <main className="min-h-screen px-4 py-10">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-ink">{TEXTS.dashboard.title}</h1>
            <p className="text-sm text-muted mt-1">
              {documents.length === 0
                ? "Carica il tuo primo documento per iniziare"
                : documents.length === 1
                  ? "1 documento analizzato"
                  : `${documents.length} documenti analizzati`}
            </p>
          </div>
          <Link href="/analyze">
            <Button size="md">{TEXTS.dashboard.newAnalysis}</Button>
          </Link>
        </div>

        {/* Piano utente + quota mensile */}
        <div className="rounded-xl border border-line bg-white p-5 space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-1">
              <p className="text-sm font-semibold text-ink">Il tuo piano</p>
              <p className="text-sm text-muted">
                {session.user.plan === "PRO"
                  ? "Sei su piano PRO. Hai accesso a tutte le funzionalità."
                  : "Vuoi più analisi e il DocumentRedactor? Passa a PRO."}
              </p>
            </div>
            <span className={`shrink-0 text-xs font-semibold px-3 py-1 rounded-full ${
              session.user.plan === "PRO"
                ? "bg-success text-white"
                : "bg-line text-muted"
            }`}>
              {session.user.plan ?? "FREE"}
            </span>
          </div>
          <div>
            <div className="flex items-baseline justify-between mb-1.5">
              <p className="text-xs text-muted">Analisi questo mese</p>
              <p className="text-xs font-semibold text-ink font-mono">{usedThisMonth} / {monthlyLimit}</p>
            </div>
            <div
              className="h-1.5 rounded-full bg-line overflow-hidden"
              role="progressbar"
              aria-valuenow={usedThisMonth}
              aria-valuemin={0}
              aria-valuemax={monthlyLimit}
              aria-label="Analisi utilizzate questo mese"
            >
              <div
                className={`h-full rounded-full transition-all ${quotaPct >= 100 ? "bg-danger" : quotaPct >= 80 ? "bg-[#F59E0B]" : "bg-brand"}`}
                style={{ width: `${quotaPct}%` }}
              />
            </div>
            {quotaPct >= 100 && (
              <p className="text-xs text-danger mt-1.5">
                Hai esaurito le analisi del mese. Il contatore si azzera il 1° del mese prossimo.
              </p>
            )}
          </div>
        </div>

        {documents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center space-y-4">
            <svg
              className="w-14 h-14 text-[#CBD5E1]"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"
              />
            </svg>
            <h2 className="text-xl font-semibold text-ink">Nessun documento ancora</h2>
            <p className="text-muted max-w-sm">
              Carica una bolletta per scoprire se stai pagando troppo, o una busta paga per capire ogni voce.
            </p>
            <Link
              href="/analyze"
              className="mt-2 inline-flex items-center justify-center px-6 py-3 bg-brand text-white rounded-lg font-medium hover:bg-brand-dark transition-colors"
            >
              Carica un documento
            </Link>
          </div>
        ) : (
          <DocumentList initialDocuments={documents} />
        )}
      </div>
    </main>
  );
}
