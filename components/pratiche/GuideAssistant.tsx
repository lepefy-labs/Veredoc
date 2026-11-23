"use client";

import { useState } from "react";
import { assistantTopics, type AssistantInstruction, type AssistantTopic } from "@/lib/pratiche/guide-assistant";

type Result = {
  instructions: AssistantInstruction[];
  assisted: boolean;
  reviewedOn?: string;
  source: { label: string; href: string };
  portal?: { label: string; href: string };
};

const topics = Object.entries(assistantTopics) as [AssistantTopic, string][];
const date = new Intl.DateTimeFormat("it-IT", { dateStyle: "long", timeZone: "UTC" });

export default function GuideAssistant({ slug }: { slug: string }) {
  const [topic, setTopic] = useState<AssistantTopic>("documenti");
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function showInstructions() {
    setBusy(true);
    setError("");
    setResult(null);
    try {
      const response = await fetch("/api/guide/assistente", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, topic }),
      });
      if (!response.ok) throw new Error();
      setResult(await response.json());
    } catch {
      setError("Il riepilogo non è disponibile. Consulta le istruzioni della guida.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section aria-labelledby="guide-assistant" className="mt-6 rounded-xl border border-line bg-white p-5 print:hidden">
      <h2 id="guide-assistant" className="text-lg font-semibold text-ink">Trova il prossimo passo</h2>
      <label htmlFor="assistant-topic" className="mt-3 block text-sm font-semibold">Cosa vuoi sapere?</label>
      <div className="mt-2 flex flex-wrap gap-2">
        <select id="assistant-topic" value={topic} disabled={busy} onChange={(event) => {
          setTopic(event.target.value as AssistantTopic);
          setResult(null);
          setError("");
        }} className="min-h-11 max-w-full rounded-lg border border-muted bg-white px-2 text-sm">
          {topics.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
        <button type="button" disabled={busy} onClick={() => void showInstructions()} className="min-h-11 rounded-lg bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-50">Mostra istruzioni</button>
      </div>
      {busy && <p role="status" className="mt-3 text-sm text-muted">Cerco le istruzioni nella guida…</p>}
      {error && <p role="alert" className="mt-3 text-sm text-danger-dark">{error}</p>}
      {result && <div className="mt-4 space-y-3 text-sm" aria-live="polite">
        {result.instructions.length > 0 ? <>
          <p className="text-muted">{result.assisted ? "Istruzioni della guida selezionate con AI." : "Istruzioni dalla guida pubblicata."}</p>
          <ul className="space-y-3">{result.instructions.map(({ title, detail }, index) => <li key={index}><strong>{title}</strong><p className="mt-1">{detail}</p></li>)}</ul>
        </> : <p>La guida non contiene indicazioni specifiche per questa domanda. Consulta la fonte ufficiale.</p>}
        {result.portal && <a href={result.portal.href} className="block min-h-11 w-fit pt-2 font-semibold text-brand underline">{result.portal.label}</a>}
        <a href={result.source.href} className="block min-h-11 w-fit pt-2 font-semibold text-brand underline">{result.source.label}</a>
        {result.reviewedOn && <p className="text-muted">Fonti verificate il <time dateTime={result.reviewedOn}>{date.format(new Date(result.reviewedOn))}</time></p>}
      </div>}
    </section>
  );
}
