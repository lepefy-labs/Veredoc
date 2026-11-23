import Link from "next/link";
import { redirect } from "next/navigation";
import GuideSearchForm from "@/components/pratiche/GuideSearchForm";
import PwaInstallCard from "@/components/pwa/PwaInstallCard";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseWorkflow, progress, type Answer } from "@/lib/pratiche/engine";
import { plainTitle } from "@/lib/pratiche/plain-language";
import { praticheEnabled, praticheSchemaReady } from "@/lib/pratiche/service";
import { OPEN_PRACTICE_STATUSES, PRACTICE_STATUS_LABELS } from "@/lib/pratiche/status";

const textLink = "inline-flex min-h-11 items-center font-semibold text-brand hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand";

async function recentCases(userId: string) {
  const items = await prisma.userCase.findMany({
    where: { userId, status: { in: OPEN_PRACTICE_STATUSES } },
    orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
    take: 3,
    select: {
      id: true, title: true, procedureVersionId: true, status: true, updatedAt: true,
      profile: { select: { label: true } },
      procedureVersion: { select: { definition: true } },
      answers: { select: { questionId: true, value: true } },
      steps: { where: { status: "DONE" }, select: { stepId: true } },
    },
  });

  return items.map((item) => {
    const workflow = parseWorkflow(item.procedureVersion.definition);
    const answers = Object.fromEntries(item.answers.map(({ questionId, value }) => [questionId, value])) as Record<string, Answer>;
    const completed = new Set(item.steps.map(({ stepId }) => stepId));
    const state = progress(workflow, answers, completed);
    return {
      id: item.id,
      title: plainTitle(item.procedureVersionId, item.title),
      status: item.status,
      profile: item.profile?.label,
      updatedAt: item.updatedAt,
      questions: state.missingQuestions.length,
      documents: state.missingSteps.filter(({ kind }) => kind === "document").length,
      done: state.done,
      required: state.required,
    };
  });
}

function nextAction(item: Awaited<ReturnType<typeof recentCases>>[number]) {
  switch (item.status) {
    case "BLOCKED": return "Rivedi la risposta che blocca il percorso.";
    case "READY_TO_SUBMIT": return "Vai al servizio ufficiale per presentare la pratica.";
    case "USER_REPORTED_SUBMITTED": return "Controlla l’esito sul servizio ufficiale.";
    default: return item.questions ? "Completa le domande sul tuo caso." : "Continua con la checklist.";
  }
}

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const hasGuides = praticheEnabled();
  const cases = hasGuides && await praticheSchemaReady() ? await recentCases(session.user.id) : [];
  const date = new Intl.DateTimeFormat("it-IT", { dateStyle: "medium", timeZone: "Europe/Rome" });
  return (
    <main className="mx-auto w-full max-w-4xl flex-1 space-y-8 px-4 py-7 sm:px-6 sm:py-10">
      <h1 className="text-3xl font-bold tracking-tight text-ink">Cosa devi risolvere?</h1>
      {hasGuides && <section aria-label="Attività in corso">
        <div className="flex flex-wrap items-center justify-between gap-x-4">
          <h2 className="text-xl font-bold text-ink">Attività in corso</h2>
          <Link href="/pratiche/mie" className={textLink}>Le mie attività</Link>
        </div>
        {cases.length === 0 ? <p className="mt-2 rounded-xl border border-line bg-white p-4 text-sm text-muted">Qui ritrovi le pratiche che avvii da una guida.</p> :
          <ul className="mt-3 space-y-3">
            {cases.map((item) => <li key={item.id}>
              <article aria-label="Pratica da riprendere" className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-line bg-white p-4 sm:p-5">
                <div>
                  <h3 className="text-lg font-semibold text-ink">{item.title}</h3>
                  <p className="mt-1 text-sm text-muted">{item.profile ? `${item.profile} · ` : ""}{PRACTICE_STATUS_LABELS[item.status]}</p>
                  <p className="mt-2 text-sm font-medium text-ink">{nextAction(item)}</p>
                  <p className="mt-1 text-sm text-muted">
                    {item.done} di {item.required} requisiti completati
                    {item.documents > 0 && ` · ${item.documents === 1 ? "1 documento da preparare" : `${item.documents} documenti da preparare`}`}
                  </p>
                  <p className="mt-1 text-sm text-muted">Ultimo aggiornamento <time dateTime={item.updatedAt.toISOString()}>{date.format(item.updatedAt)}</time></p>
                </div>
                <Link href={`/pratiche/caso/${item.id}?from=dashboard`} prefetch={false} className="inline-flex min-h-11 items-center rounded-lg bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand">Riprendi pratica</Link>
              </article>
            </li>)}
          </ul>}
      </section>}
      {hasGuides && <section aria-labelledby="start-guide">
        <h2 id="start-guide" className="mb-3 text-xl font-bold text-ink">Inizia un percorso</h2>
        <GuideSearchForm id="dashboard-search" />
        <Link href="/guide" className={textLink}>Sfoglia tutte le guide</Link>
      </section>}
      <section aria-labelledby="document-area" className="rounded-xl border border-line bg-white p-4 sm:p-5">
        <h2 id="document-area" className="text-xl font-bold text-ink">Documenti</h2>
        <div className="mt-1 flex flex-wrap gap-x-6">
          <Link href="/dashboard/documenti" className={textLink}>Apri l’archivio</Link>
          <Link href="/analyze" className={textLink}>Analizza un documento</Link>
        </div>
      </section>
      <PwaInstallCard />
    </main>
  );
}
