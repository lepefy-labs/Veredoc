import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AnalysisStatus } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getMonthlyUsage } from "@/lib/account/usage";
import { canNotifyByEmail } from "@/lib/notifications/config";
import PlanUsage from "@/components/account/PlanUsage";
import PasswordChangeForm from "@/components/account/PasswordChangeForm";
import ProfileSettings from "@/components/account/ProfileSettings";
import SignOutButton from "@/components/account/SignOutButton";
import ProfileManager from "@/components/ProfileManager";

export const metadata: Metadata = {
  title: "Account — Veredoc",
  robots: { index: false, follow: false },
};

function Section({ id, title, description, children }: { id: string; title: string; description?: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={`${id}-title`} id={id} className="scroll-mt-20 space-y-4 rounded-xl border border-line bg-white p-5">
      <div>
        <h2 id={`${id}-title`} className="text-base font-semibold text-ink">{title}</h2>
        {description && <p className="mt-1 text-sm text-muted">{description}</p>}
      </div>
      {children}
    </section>
  );
}

export default async function AccountPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?callbackUrl=%2Faccount");

  const [user, profiles] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { email: true, plan: true, createdAt: true },
    }),
    prisma.analysisProfile.findMany({
      where: { userId: session.user.id },
      orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
      select: {
        id: true,
        label: true,
        kind: true,
        isDefault: true,
        _count: { select: { documents: { where: { status: { not: AnalysisStatus.DELETED } } } } },
      },
    }),
  ]);
  if (!user) redirect("/login");

  const usage = await getMonthlyUsage(session.user.id, user.plan);
  const emailNotifications = canNotifyByEmail(user.email);
  const memberSince = user.createdAt.toLocaleDateString("it-IT", { day: "numeric", month: "long", year: "numeric" });

  return (
    <main className="min-h-screen px-4 pb-28 pt-6 sm:py-10">
      <div className="mx-auto max-w-2xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-ink">Account</h1>
          <p className="mt-1 text-sm text-muted">Dati di accesso, piano, profili e privacy.</p>
        </div>

        <Section id="accesso" title="Accesso">
          <dl className="grid gap-3 text-sm sm:grid-cols-[160px_1fr]">
            <dt className="text-muted">Email</dt>
            <dd className="break-all font-medium text-ink">{user.email}</dd>
            <dt className="text-muted">Cliente dal</dt>
            <dd className="text-ink">{memberSince}</dd>
          </dl>
          <div className="flex flex-col gap-3 border-t border-line pt-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="sm:flex-1"><PasswordChangeForm /></div>
            <SignOutButton />
          </div>
        </Section>

        <Section id="piano" title="Piano e utilizzo">
          <PlanUsage plan={usage.plan} used={usage.used} limit={usage.limit} />
        </Section>

        <Section
          id="profili"
          title="Profili di analisi"
          description="Separa i documenti tuoi, dei familiari, delle case o di un'attività. I confronti storici restano dentro lo stesso profilo."
        >
          <ProfileSettings
            profiles={profiles.map((profile) => ({
              id: profile.id,
              label: profile.label,
              kind: profile.kind,
              isDefault: profile.isDefault,
              documentCount: profile._count.documents,
            }))}
          />
          <ProfileManager
            profiles={profiles.map(({ id, label, kind, isDefault }) => ({ id, label, kind, isDefault }))}
            variant="inline"
          />
        </Section>

        <Section id="notifiche" title="Notifiche email">
          <p className="text-sm text-ink">
            {emailNotifications
              ? `Ti scriviamo a ${user.email} quando un'analisi è pronta, se non riusciamo a completarla o se richiede più tempo del previsto.`
              : "Le notifiche email sull'esito delle analisi non sono attive al momento: trovi sempre il risultato nella dashboard."}
          </p>
          <p className="text-xs text-muted">Sono comunicazioni di servizio legate alle tue analisi: non contengono dati dei documenti e non sono messaggi promozionali.</p>
        </Section>

        <Section id="privacy" title="Privacy e dati">
          <p className="text-sm text-ink">
            Puoi eliminare i singoli documenti dalla dashboard. Per ricevere una copia dei tuoi dati o chiudere l&apos;account scrivi a{" "}
            <a href="mailto:privacy@veredoc.it" className="font-medium text-brand hover:underline">privacy@veredoc.it</a>.
          </p>
          <p className="text-sm">
            <Link href="/privacy" className="text-brand hover:underline">Privacy Policy</Link>
            <span className="mx-2 text-faint" aria-hidden="true">·</span>
            <Link href="/termini" className="text-brand hover:underline">Termini di servizio</Link>
          </p>
        </Section>
      </div>
    </main>
  );
}
