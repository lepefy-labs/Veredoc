import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import ProfileManager from "@/components/ProfileManager";
import ProfileDashboard from "@/components/ProfileDashboard";
import { TEXTS } from "@/lib/config/texts";
import { AnalysisStatus } from "@prisma/client";
import { buildLongitudinalInsights } from "@/lib/insights/history";
import { buildMultiPeriodTrends } from "@/lib/insights/trends";
import { documentPage, readFirstDocumentPages, readInsightDocuments } from "@/lib/dashboard/documents";

export default async function DocumentsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?callbackUrl=%2Fdashboard%2Fdocumenti");

  const userId = session.user.id;
  const [profiles, pages, insightDocuments] = await Promise.all([
    prisma.analysisProfile.findMany({
      where: { userId },
      orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
      select: {
        id: true,
        label: true,
        kind: true,
        isDefault: true,
        _count: { select: { documents: { where: { userId, status: { not: AnalysisStatus.DELETED } } } } },
      },
    }),
    readFirstDocumentPages(userId),
    readInsightDocuments(userId),
  ]);

  const documentsCount = profiles.reduce((total, profile) => total + profile._count.documents, 0);
  const profileOptions = profiles.map(({ id, label, kind, isDefault }) => ({ id, label, kind, isDefault }));
  const dashboardProfiles = profiles.map(({ id, label, kind, isDefault, _count }) => {
    const sample = insightDocuments.get(id) ?? [];
    return {
      id, label, kind, isDefault,
      insights: buildLongitudinalInsights(sample),
      trends: buildMultiPeriodTrends(sample, id),
      documentPage: documentPage(pages.get(id) ?? []),
      documentCount: _count.documents,
    };
  });
  const defaultProfile = profiles.find((profile) => profile.isDefault) ?? profiles[0];
  const analyzeHref = defaultProfile ? `/analyze?profile=${encodeURIComponent(defaultProfile.id)}` : "/analyze";

  return (
    <main className="min-h-screen px-4 pb-28 pt-6 sm:py-10">
      <div className="mx-auto max-w-4xl space-y-6 sm:space-y-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-ink">Documenti</h1>
            <p className="mt-1 text-sm text-muted">
              {documentsCount === 0 ? "Carica il tuo primo documento per iniziare" : documentsCount === 1 ? "1 documento" : `${documentsCount} documenti`}
            </p>
          </div>
          <Link href={analyzeHref} className="inline-flex min-h-11 items-center rounded-lg bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand">
            {TEXTS.dashboard.newAnalysis}
          </Link>
        </div>
        <ProfileManager profiles={profileOptions} />

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
