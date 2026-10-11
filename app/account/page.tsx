import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AnalysisStatus } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getMonthlyUsage } from "@/lib/account/usage";
import { canNotifyByEmail, isEmailProviderConfigured } from "@/lib/notifications/config";
import { getAccountSessionState, isLifecycleAvailable } from "@/lib/account/state";
import PlanUsage from "@/components/account/PlanUsage";
import PasswordChangeForm from "@/components/account/PasswordChangeForm";
import ProfileSettings from "@/components/account/ProfileSettings";
import SignOutButton from "@/components/account/SignOutButton";
import EmailVerification from "@/components/account/EmailVerification";
import EmailChangeForm from "@/components/account/EmailChangeForm";
import DeleteAccount from "@/components/account/DeleteAccount";
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

  const [usage, accountState] = await Promise.all([
    getMonthlyUsage(session.user.id, user.plan),
    getAccountSessionState(session.user.id, { fresh: true }),
  ]);
  const emailStatus = accountState?.emailStatus ?? "unknown";
  const lifecycle = isLifecycleAvailable() && emailStatus !== "unknown" && isEmailProviderConfigured();
  const emailNotifications = canNotifyByEmail(user.email, process.env, emailStatus);
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
            <dd className="space-y-2">
              <p className="break-all font-medium text-ink">{user.email}</p>
              <EmailVerification status={emailStatus} canSend={lifecycle} />
            </dd>
            <dt className="text-muted">Cliente dal</dt>
            <dd className="text-ink">{memberSince}</dd>
          </dl>
          <div className="flex flex-col gap-3 border-t border-line pt-4 sm:flex-row sm:flex-wrap sm:items-start">
            {lifecycle && <div className="sm:flex-1"><EmailChangeForm /></div>}
            <div className="sm:flex-1"><PasswordChangeForm /></div>
          </div>
          <div className="border-t border-line pt-4">
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
              : emailStatus === "unverified"
                ? "Conferma il tuo indirizzo email per ricevere gli avvisi sull'esito delle analisi. Nel frattempo trovi sempre il risultato nella dashboard."
                : "Le notifiche email sull'esito delle analisi non sono attive al momento: trovi sempre il risultato nella dashboard."}
          </p>
          <p className="text-xs text-muted">Sono comunicazioni di servizio legate alle tue analisi: non contengono dati dei documenti e non sono messaggi promozionali.</p>
        </Section>

        <Section id="privacy" title="Privacy e dati">
          <div className="space-y-2">
            <p className="text-sm text-ink">
              Scarica una copia dei tuoi dati in formato JSON: account, profili, documenti con dati estratti e analisi,
              consensi e notifiche, con link validi 24 ore ai file originali.
            </p>
            <a
              href="/api/account/export"
              download
              className="inline-flex w-full items-center justify-center rounded-lg border border-line bg-white px-4 py-2 text-sm font-medium text-ink hover:bg-page sm:w-auto"
            >
              Scarica i miei dati
            </a>
          </div>
          <div className="space-y-2 border-t border-line pt-4">
            <p className="text-sm text-ink">Puoi eliminare i singoli documenti dalla dashboard oppure l&apos;intero account.</p>
            <DeleteAccount />
          </div>
          <p className="text-xs text-muted">
            Per altre richieste sui tuoi dati scrivi a{" "}
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
