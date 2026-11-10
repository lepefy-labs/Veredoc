import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import Button from "@/components/ui/Button";
import ProfileManager from "@/components/ProfileManager";
import ProfileDashboard from "@/components/ProfileDashboard";
import PwaInstallCard from "@/components/pwa/PwaInstallCard";
import PlanUsage from "@/components/account/PlanUsage";
import { TEXTS } from "@/lib/config/texts";
import { ANALYSIS_LIMITS } from "@/lib/config/constants";
import { startOfCurrentMonthUtc } from "@/lib/account/usage";
import { AnalysisStatus, UserPlan } from "@prisma/client";
import { buildLongitudinalInsights } from "@/lib/insights/history";
import { buildMultiPeriodTrends } from "@/lib/insights/trends";
import { summarizeDocument } from "@/lib/dashboard/summary";
import { praticheEnabled } from "@/lib/pratiche/feature";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const startOfMonth = startOfCurrentMonthUtc();
  const [profiles, usedThisMonth] = await Promise.all([
    prisma.analysisProfile.findMany({
      where: { userId: session.user.id },
      orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
      select: {
        id: true,
        label: true,
        kind: true,
        isDefault: true,
        documents: {
          where: { status: { not: AnalysisStatus.DELETED } },
          orderBy: { createdAt: "desc" },
          // Solo le colonne necessarie: niente rawExtracted, testo anonimizzato o mappe.
          select: { id: true, profileId: true, type: true, fileName: true, status: true, createdAt: true, analysis: true },
        },
      },
    }),
    prisma.document.count({
      where: {
        userId: session.user.id,
        createdAt: { gte: startOfMonth },
      },
    }),
  ]);

  const documentsCount = profiles.reduce((total, profile) => total + profile.documents.length, 0);
  const plan = session.user.plan === "PRO" ? UserPlan.PRO : UserPlan.FREE;
  const monthlyLimit = ANALYSIS_LIMITS[plan];
  const profileOptions = profiles.map(({ id, label, kind, isDefault }) => ({ id, label, kind, isDefault }));
  // Storico e trend calcolati sul server: al client arrivano risultati e riepiloghi,
  // non le analisi complete di tutti i documenti.
  const dashboardProfiles = profiles.map((profile) => ({
    id: profile.id,
    label: profile.label,
    kind: profile.kind,
    isDefault: profile.isDefault,
    insights: buildLongitudinalInsights(profile.documents),
    trends: buildMultiPeriodTrends(profile.documents, profile.id),
    documents: profile.documents.map(summarizeDocument),
  }));
  const defaultProfile = profiles.find((profile) => profile.isDefault) ?? profiles[0];
  const analyzeHref = defaultProfile ? `/analyze?profile=${encodeURIComponent(defaultProfile.id)}` : "/analyze";
  const praticheAvailable = praticheEnabled();

  return (
    <main className="min-h-screen px-4 pb-28 pt-6 sm:py-10">
      <div className="mx-auto max-w-4xl space-y-6 sm:space-y-8">
        <div className="flex items-center justify-between gap-4">
          <div>
            {praticheAvailable && <p className="mb-1 text-xs font-semibold uppercase tracking-[0.14em] text-brand">Il tuo spazio</p>}
            <h1 className="text-2xl font-bold text-ink">{praticheAvailable ? "Cosa vuoi fare oggi?" : TEXTS.dashboard.title}</h1>
            <p className="mt-1 text-sm text-muted">
              {praticheAvailable ? "Scegli un percorso per le tue pratiche oppure analizza un documento." : documentsCount === 0 ? "Carica il tuo primo documento per iniziare" : documentsCount === 1 ? "1 documento" : `${documentsCount} documenti`}
            </p>
          </div>
          {!praticheAvailable && <Link href={analyzeHref} className="hidden sm:block">
            <Button size="md">{TEXTS.dashboard.newAnalysis}</Button>
          </Link>}
        </div>

        {praticheAvailable ? <section aria-label="Scegli una funzione" className="grid gap-4 sm:grid-cols-2">
          <Link href="/pratiche" className="group flex min-h-44 flex-col justify-between rounded-2xl bg-brand p-6 text-white shadow-sm transition-colors hover:bg-brand-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand">
            <div><p className="text-xs font-bold uppercase tracking-[0.12em] text-white/75">Veredoc Pratiche</p><h2 className="mt-3 text-xl font-bold">Prepara una pratica</h2><p className="mt-2 text-sm leading-6 text-white/85">Percorsi guidati, fonti ufficiali e attività da completare.</p></div>
            <span className="mt-5 font-semibold">Apri Pratiche <span aria-hidden="true">→</span></span>
          </Link>
          <Link href={analyzeHref} className="group flex min-h-44 flex-col justify-between rounded-2xl border border-line bg-white p-6 text-ink shadow-sm transition-colors hover:border-brand/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand">
            <div><p className="text-xs font-bold uppercase tracking-[0.12em] text-brand">Analisi documenti</p><h2 className="mt-3 text-xl font-bold">Analizza un documento</h2><p className="mt-2 text-sm leading-6 text-muted">Carica una bolletta o una busta paga e leggi le voci in chiaro.</p></div>
            <span className="mt-5 font-semibold text-brand">Nuova analisi <span aria-hidden="true">→</span></span>
          </Link>
        </section> : <Link
          href={analyzeHref}
          className="flex min-h-16 items-center justify-between gap-4 rounded-2xl bg-brand px-5 py-4 text-white shadow-sm transition-colors hover:bg-brand-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand sm:hidden"
        >
          <div>
            <p className="font-semibold">Analizza un documento</p>
            <p className="mt-0.5 text-xs text-white/80">Scatta una foto oppure scegli PDF, JPG o PNG</p>
          </div>
          <span className="text-2xl" aria-hidden="true">+</span>
        </Link>}

        <PwaInstallCard />

        {praticheAvailable && <div><h2 className="text-lg font-bold text-ink">I tuoi documenti</h2><p className="mt-1 text-sm text-muted">{documentsCount === 0 ? "Nessun documento analizzato" : documentsCount === 1 ? "1 documento" : `${documentsCount} documenti`}</p></div>}
        <ProfileManager profiles={profileOptions} />

        <div className="rounded-xl border border-line bg-white p-5">
          <PlanUsage plan={plan} used={usedThisMonth} limit={monthlyLimit} compact />
        </div>

        {profiles.length === 0 ? (
          <div className="rounded-xl border border-line bg-white p-8 text-center">
            <p className="text-sm text-muted">Nessun profilo disponibile.</p>
          </div>
        ) : (
          <ProfileDashboard profiles={dashboardProfiles} profileOptions={profileOptions} />
        )}
      </div>
    </main>
  );
}
