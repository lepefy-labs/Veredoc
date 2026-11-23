"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { applies, type Answer, type Workflow } from "@/lib/pratiche/engine";
import type { Preparation } from "@/lib/pratiche/plain-language";
import { dsuPreparation, DSU_PROCEDURE_SLUG } from "@/lib/pratiche/dsu-preparation";
import CaseEvidence from "./CaseEvidence";
import DsuPreparation from "./DsuPreparation";
import PreparationList from "./PreparationList";
import { PRACTICE_STATUS_LABELS } from "@/lib/pratiche/status";

type CaseView = {
  id: string; title: string; status: string; revision: number; answers: Record<string, Answer>;
  procedure: { slug: string };
  completed: string[]; workflow: Workflow; progress: { required: number; done: number; ready: boolean; blocked: boolean; missing: string[] };
  preparation: Preparation | null;
  dsuLinkedSteps?: string[] | null;
  history?: { id: string; type: string; createdAt: string | Date }[];
  sources: { title: string; authority: string; url: string; verifiedAt: string | Date | null; version: number }[];
};

function visibleItems(current: CaseView) {
  return [
    ...current.workflow.questions.filter((question) => applies(question.when, current.answers)).map((question) => ({ kind: "question" as const, item: question })),
    ...(current.progress.blocked ? [] : current.workflow.steps.filter((step) => applies(step.when, current.answers)).map((step) => ({ kind: "step" as const, item: step }))),
  ];
}

function resumePosition(initial: CaseView): number {
  const items = visibleItems(initial);
  if (initial.progress.blocked) {
    const blocker = items.findIndex(({ kind, item }) => kind === "question" && item.blockedValues?.some((value) => {
      const answer = initial.answers[item.id];
      return Array.isArray(answer) ? answer.includes(String(value)) : answer === value;
    }));
    return Math.max(0, blocker);
  }
  const next = items.findIndex(({ kind, item }) => item.required && (
    kind === "question" ? !(item.id in initial.answers) : !initial.completed.includes(item.id)
  ));
  if (next >= 0) return next;
  const portal = items.findIndex(({ kind, item }) => kind === "step" && item.kind === "portal");
  return portal >= 0 ? portal : Math.max(0, items.length - 1);
}

const dateFormat = new Intl.DateTimeFormat("it-IT", { dateStyle: "short", timeStyle: "short", timeZone: "Europe/Rome" });
const eventLabels: Record<string, string> = {
  CREATED: "Pratica avviata",
  ANSWERED: "Risposta salvata",
  STEP_UPDATED: "Checklist aggiornata",
  PREPARED: "Checklist completata",
  USER_REPORTED_SUBMITTED: "Presentazione dichiarata",
  COMPLETED: "Pratica conclusa",
  CANCELLED: "Pratica annullata",
};

export default function CaseWizard({ initial, resumeVisit, evidenceEnabled }: { initial: CaseView; resumeVisit?: string; evidenceEnabled?: boolean }) {
  const router = useRouter();
  const [current, setCurrent] = useState(initial);
  const [position, setPosition] = useState(() => initial.revision === 0 ? 0 : resumePosition(initial));
  const [pendingResumeVisit, setPendingResumeVisit] = useState(resumeVisit);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [conflict, setConflict] = useState(false);
  const readOnly = ["USER_REPORTED_SUBMITTED", "COMPLETED", "CANCELLED"].includes(current.status);
  const [draft, setDraft] = useState<Answer | undefined>();
  const [helpFor, setHelpFor] = useState<string | null>(null);
  const items = useMemo(() => visibleItems(current), [current]);
  const index = Math.min(position, Math.max(items.length - 1, 0));
  const active = items[index];
  const isDsu = current.procedure.slug === DSU_PROCEDURE_SLUG;
  const dsu = isDsu ? dsuPreparation(current.workflow, current.answers, current.completed, current.dsuLinkedSteps ?? null) : null;
  const nextPosition = isDsu && !readOnly ? resumePosition(current) : -1;
  const nextStep = items[nextPosition]?.item.title;
  const syncDsuFile = useCallback((stepId: string, linked: boolean) => {
    setCurrent((value) => {
      const steps = value.dsuLinkedSteps;
      if (!steps || steps.includes(stepId) === linked) return value;
      return { ...value, dsuLinkedSteps: linked ? [...steps, stepId] : steps.filter((id) => id !== stepId) };
    });
  }, []);

  function continueDsu() {
    if (nextPosition !== index) {
      setPosition(nextPosition);
      setDraft(undefined);
      setError("");
    }
    document.getElementById("case-current-step")?.focus();
  }
  const officialPortal = current.workflow.steps.find((item) => item.kind === "portal" && item.url && applies(item.when, current.answers));
  const percent = current.progress.required ? Math.round(100 * current.progress.done / current.progress.required) : 100;

  async function save(payload: Record<string, unknown>, next = true) {
    setBusy(true); setError("");
    try {
      const response = await fetch(`/api/pratiche/cases/${current.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...payload, expectedRevision: current.revision, resumeVisit: pendingResumeVisit }) });
      const body = await response.json();
      if (body.code === "revision_conflict") setConflict(true);
      if (!response.ok || !body.case) throw new Error(body.error ?? "Salvataggio non riuscito. Riprova.");
      const saved: CaseView = body.case;
      setCurrent(saved);
      if (body.advanced) setPendingResumeVisit(undefined);
      setDraft(undefined);
      if (next) setPosition(Math.min(index + 1, Math.max(visibleItems(saved).length - 1, 0)));
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Errore di rete. Riprova."); }
    finally { setBusy(false); }
  }

  async function reloadCase() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/pratiche/cases/${current.id}`, { cache: "no-store" });
      const body = await response.json();
      if (!response.ok || !body.case) throw new Error(body.error ?? "Non è stato possibile aggiornare la pratica.");
      const latest: CaseView = body.case;
      setCurrent(latest);
      setPosition(resumePosition(latest));
      setDraft(undefined);
      setConflict(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Errore di rete. Riprova.");
    } finally {
      setBusy(false);
    }
  }

  function next() {
    if (!active) return;
    if (active.kind === "question" && !readOnly) {
      const value = draft ?? current.answers[active.item.id];
      if (value === undefined) {
        if (active.item.required) { setError("Seleziona una risposta."); return; }
        setPosition(Math.min(index + 1, items.length - 1)); return;
      }
      if (draft === undefined) {
        setPosition(Math.min(index + 1, items.length - 1));
        setError("");
        return;
      }
      void save({ kind: "answer", questionId: active.item.id, value });
    } else setPosition(Math.min(index + 1, items.length - 1));
  }

  async function removeCase() {
    if (!window.confirm("Vuoi eliminare questa pratica e tutte le tue risposte? Non potrai recuperarle.")) return;
    setBusy(true); setError("");
    try {
      const response = await fetch(`/api/pratiche/cases/${current.id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Eliminazione non riuscita.");
      router.push("/pratiche/mie");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Errore di rete."); setBusy(false); }
  }

  return <div className="mx-auto w-full max-w-3xl px-4 pb-36 pt-8 sm:pb-12">
    <div className="flex items-center justify-between gap-3"><Link href="/pratiche/mie" className="text-sm font-semibold text-brand">← Le mie attività</Link><span className="text-xs font-semibold text-muted">{PRACTICE_STATUS_LABELS[current.status] ?? current.status}</span></div>
    <h1 className="mt-5 text-2xl font-bold">{current.title}</h1>
    <Link href={`/pratiche/${current.procedure.slug}`} className="inline-flex min-h-11 items-center text-sm font-semibold text-brand underline">
      Documenti e istruzioni
    </Link>
    <p className="mt-2 text-sm text-muted">Hai completato {current.progress.done} passaggi su {current.progress.required}</p>
    {dsu && (
      <DsuPreparation
        preparation={dsu}
        nextStep={nextStep}
        sources={current.sources}
        message={readOnly ? "Qui puoi consultare lo stato salvato della preparazione." :
          current.progress.blocked ? "Rivedi la risposta che richiede attenzione prima di proseguire." :
          dsu.questions.length ? "Rispondi alle domande per vedere i documenti richiesti nel tuo caso." :
          current.progress.ready ? "Hai completato la checklist di preparazione. Puoi consultare il servizio ufficiale." :
          "Completa i passaggi della checklist a partire da quello indicato."}
        onContinue={nextStep && !busy && !conflict ? continueDsu : undefined}
      />
    )}
    <div className="mt-3 h-2 overflow-hidden rounded-full bg-line" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100} aria-label="Avanzamento"><div className="h-full bg-brand" style={{ width: `${percent}%` }} /></div>
    {current.preparation && <details className="mt-5 rounded-xl border border-line bg-white p-4"><summary className="cursor-pointer text-sm font-semibold text-brand">Rivedi dati e documenti</summary><div className="mt-4"><PreparationList preparation={current.preparation} embedded /></div></details>}
    {current.progress.blocked && <div className="mt-5 rounded-xl border border-line bg-white p-5" role="status"><p className="font-semibold">{current.procedure.slug === "cambio-residenza" ? "Per questo caso, chiedi al Comune" : "Questa risposta blocca il percorso"}</p><p className="mt-2 text-sm text-muted">Controlla la risposta e consulta le istruzioni ufficiali per il tuo caso.</p></div>}
    {active && <section id="case-current-step" tabIndex={-1} className="scroll-mt-24 mt-8 rounded-2xl border border-line bg-white p-5 sm:p-7">
      <p className="text-xs font-semibold uppercase tracking-wide text-brand">Passaggio {index + 1} di {items.length}</p>
      {active.kind === "step" ? <>
        <div className="mt-3 flex items-start justify-between gap-3"><h2 className="text-xl font-bold">{active.item.title}</h2><button type="button" aria-label={`Spiegazione: ${active.item.title}`} aria-expanded={helpFor === active.item.id} aria-controls={`step-help-${active.item.id}`} onClick={() => setHelpFor(helpFor === active.item.id ? null : active.item.id)} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-line text-sm font-bold text-brand hover:bg-brand-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand">?</button></div>
        <p id={`step-help-${active.item.id}`} hidden={helpFor !== active.item.id} className="mt-3 text-sm leading-6 text-muted">{active.item.description}</p>
      </> : <h2 className="mt-3 text-xl font-bold">{active.item.title}</h2>}
      {active.kind === "question" ? <fieldset disabled={busy || readOnly || conflict} className="mt-5 space-y-3"><legend className="sr-only">{active.item.title}</legend>
        {active.item.type === "boolean" ? [true, false].map((value) => <label key={String(value)} className="flex min-h-12 items-center gap-3 rounded-xl border border-line p-3"><input type="radio" name={active.item.id} checked={(draft ?? current.answers[active.item.id]) === value} onChange={() => setDraft(value)} />{value ? "Sì" : "No"}</label>) : active.item.options?.map((option) => {
          const selected = draft ?? current.answers[active.item.id];
          const checked = active.item.type === "multiple" ? Array.isArray(selected) && selected.includes(option.value) : selected === option.value;
          return <label key={option.value} className="flex min-h-12 items-center gap-3 rounded-xl border border-line p-3"><input type={active.item.type === "multiple" ? "checkbox" : "radio"} name={active.item.id} checked={checked} onChange={() => setDraft(active.item.type === "multiple" ? checked ? (selected as string[]).filter((item) => item !== option.value) : [...(Array.isArray(selected) ? selected : []), option.value] : option.value)} />{option.label}</label>;
        })}
      </fieldset> : <>
        {active.item.kind === "portal" && active.item.url && <a href={active.item.url} target="_blank" rel="noopener noreferrer" className="mt-4 inline-block font-semibold text-brand underline">Vai al sito ufficiale ↗</a>}
        {evidenceEnabled && active.item.kind === "document" && <CaseEvidence key={active.item.id} caseId={current.id} stepId={active.item.id} onAvailabilityChange={isDsu ? syncDsuFile : undefined} />}
        {active.item.kind !== "portal" && <label className="mt-6 flex min-h-12 items-center gap-3 rounded-xl border border-line p-3"><input type="checkbox" checked={current.completed.includes(active.item.id)} disabled={busy || readOnly || conflict} onChange={(event) => void save({ kind: "step", stepId: active.item.id, done: event.target.checked }, false)} />Ho fatto questo passaggio</label>}
      </>}
      <div className="sticky bottom-[calc(4.7rem+env(safe-area-inset-bottom))] z-20 -mx-5 mt-6 flex justify-between gap-3 border-t border-line bg-white px-5 py-3 sm:static sm:mx-0 sm:border-0 sm:px-0"><button type="button" disabled={busy || index === 0} onClick={() => { setPosition(index - 1); setDraft(undefined); setError(""); }} className="min-h-11 rounded-lg border border-line px-4 disabled:opacity-40">Indietro</button><button type="button" disabled={busy || conflict || (index === items.length - 1 && (active.kind !== "question" || readOnly))} onClick={next} className="min-h-11 rounded-lg bg-brand px-5 font-semibold text-white disabled:opacity-40">{busy ? "Salvataggio..." : "Avanti"}</button></div>
    </section>}
    {(error || conflict) && <div className="mt-5 rounded-xl border border-line bg-white p-4">
      {error && <p role="alert" className="text-sm text-danger-dark">{error}</p>}
      {conflict && <>
        <p className="text-sm text-ink">Carica la versione aggiornata. Le modifiche che non hai salvato andranno perse.</p>
        <button type="button" disabled={busy} onClick={() => void reloadCase()} className="min-h-11 text-sm font-semibold text-brand underline disabled:opacity-50">Carica versione aggiornata</button>
      </>}
    </div>}
    {!isDsu && !current.progress.ready && !current.progress.blocked && current.progress.missing.length > 0 && <details className="mt-6 rounded-xl border border-line bg-white p-5"><summary className="cursor-pointer font-semibold text-brand">Passaggi da fare: {current.progress.missing.length}</summary><ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-muted">{current.progress.missing.map((name) => <li key={name}>{name}</li>)}</ul></details>}
    {current.progress.ready && current.status === "READY_TO_SUBMIT" && <div className="mt-6 rounded-xl border border-line bg-white p-5"><h2 className="font-semibold">Puoi inviare la richiesta</h2><p className="mt-2 text-sm text-muted">Inviala sul sito ufficiale.</p><button type="button" disabled={busy || conflict} onClick={() => void save({ kind: "status", status: "USER_REPORTED_SUBMITTED" }, false)} className="mt-4 rounded-lg bg-brand px-4 py-3 font-semibold text-white">Ho inviato la richiesta</button></div>}
    {current.status === "USER_REPORTED_SUBMITTED" && <div className="mt-6 rounded-xl border border-line bg-white p-5"><h2 className="font-semibold">Presentazione dichiarata da te</h2><p className="mt-2 text-sm text-muted">Controlla l’esito presso l’ente. Quando il percorso è terminato, segna la pratica come conclusa.</p>{officialPortal?.url && <a href={officialPortal.url} target="_blank" rel="noopener noreferrer" className="mt-2 mr-4 inline-flex min-h-11 items-center text-sm font-semibold text-brand underline">Apri il servizio ufficiale</a>}<button type="button" disabled={busy || conflict} onClick={() => void save({ kind: "status", status: "COMPLETED" }, false)} className="mt-4 rounded-lg bg-brand px-4 py-3 font-semibold text-white">Segna come conclusa</button></div>}
    <details className="mt-6 rounded-xl border border-line bg-white p-5"><summary className="cursor-pointer font-semibold text-brand">Fonti ufficiali</summary><ul className="mt-3 space-y-2 text-sm">{current.sources.map((source) => <li key={source.url}><a href={source.url} target="_blank" rel="noopener noreferrer" className="text-brand underline">{source.title}</a><span className="block text-xs text-muted">{source.authority}. Controllata il {source.verifiedAt ? new Date(source.verifiedAt).toLocaleDateString("it-IT") : "data non disponibile"}.</span></li>)}</ul></details>
    {current.history && current.history.length > 0 && <details className="mt-6 rounded-xl border border-line bg-white p-5">
      <summary className="cursor-pointer font-semibold text-brand">Attività recenti</summary>
      <ul className="mt-3 space-y-2 text-sm">
        {current.history.map((event) => {
          const label = eventLabels[event.type];
          if (!label) return null;
          const date = new Date(event.createdAt);
          return <li key={event.id}><span>{label}</span> · <time dateTime={date.toISOString()} className="text-muted">{dateFormat.format(date)}</time></li>;
        })}
      </ul>
    </details>}
    <div className="mt-6 flex flex-wrap gap-x-5">
    <a href={`/api/pratiche/cases/${encodeURIComponent(current.id)}/riepilogo`} className="inline-flex min-h-11 items-center text-sm font-semibold text-brand underline">Scarica riepilogo PDF</a>
    <button type="button" disabled={busy} onClick={() => void removeCase()} className="min-h-11 text-sm font-semibold text-danger underline disabled:opacity-50">Elimina la pratica</button>
    </div>
  </div>;
}
