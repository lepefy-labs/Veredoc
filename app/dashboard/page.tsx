import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import Button from "@/components/ui/Button";
import ProfileManager from "@/components/ProfileManager";
import ProfileDashboard from "@/components/ProfileDashboard";
import { TEXTS } from "@/lib/config/texts";
import { ANALYSIS_LIMITS } from "@/lib/config/constants";
import { AnalysisStatus, UserPlan } from "@prisma/client";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const startOfMonth = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1));
  const [profiles, usedThisMonth] = await Promise.all([
    prisma.analysisProfile.findMany({
      where: { userId: session.user.id },
      orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
      include: {
        documents: {
          where: { status: { not: AnalysisStatus.DELETED } },
          orderBy: { createdAt: "desc" },
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
  const quotaPct = Math.min(100, Math.round((usedThisMonth / monthlyLimit) * 100));
  const profileOptions = profiles.map(({ id, label, kind, isDefault }) => ({ id, label, kind, isDefault }));
  const dashboardProfiles = profiles.map((profile) => ({
    id: profile.id,
    label: profile.label,
    kind: profile.kind,
    isDefault: profile.isDefault,
    documents: profile.documents.map((document) => ({
      id: document.id,
      profileId: document.profileId,
      type: document.type,
      fileName: document.fileName,
      status: document.status,
      createdAt: document.createdAt.toISOString(),
      analysis: document.analysis,
    })),
  }));
  const defaultProfile = profiles.find((profile) => profile.isDefault) ?? profiles[0];

  return (
    <main className="min-h-screen px-4 py-10">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-ink">{TEXTS.dashboard.title}</h1>
            <p className="text-sm text-muted mt-1">
              {documentsCount === 0 ? "Carica il tuo primo documento per iniziare" : documentsCount === 1 ? "1 documento" : `${documentsCount} documenti`}
            </p>
          </div>
          <Link href={defaultProfile ? `/analyze?profile=${encodeURIComponent(defaultProfile.id)}` : "/analyze"}>
            <Button size="md">{TEXTS.dashboard.newAnalysis}</Button>
          </Link>
        </div>

        <ProfileManager profiles={profileOptions} />

        <div className="rounded-xl border border-line bg-white p-5 space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-1">
              <p className="text-sm font-semibold text-ink">Il tuo piano</p>
              <p className="text-sm text-muted">{session.user.plan === "PRO" ? "Sei su piano PRO. Hai accesso a tutte le funzionalità." : "Vuoi più analisi e l'anonimizzatore dei documenti? Passa a PRO."}</p>
            </div>
            <span className={`shrink-0 text-xs font-semibold px-3 py-1 rounded-full ${session.user.plan === "PRO" ? "bg-success text-white" : "bg-line text-muted"}`}>{session.user.plan ?? "FREE"}</span>
          </div>
          <div>
            <div className="flex items-baseline justify-between mb-1.5">
              <p className="text-xs text-muted">Analisi utilizzate questo mese</p>
              <p className="text-xs font-semibold text-ink font-mono">{usedThisMonth} / {monthlyLimit}</p>
            </div>
            <div className="h-1.5 rounded-full bg-line overflow-hidden" role="progressbar" aria-valuenow={usedThisMonth} aria-valuemin={0} aria-valuemax={monthlyLimit} aria-label="Analisi utilizzate questo mese">
              <div className={`h-full rounded-full transition-all ${quotaPct >= 100 ? "bg-danger" : quotaPct >= 80 ? "bg-[#F59E0B]" : "bg-brand"}`} style={{ width: `${quotaPct}%` }} />
            </div>
            {quotaPct >= 100 && <p className="text-xs text-danger mt-1.5">Hai esaurito le analisi del mese. Il contatore si azzera il 1° del mese prossimo.</p>}
          </div>
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
