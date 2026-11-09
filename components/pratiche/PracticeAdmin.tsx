"use client";

import { useState } from "react";

type Data = {
  sources: { id: string; title: string; authority: string; url: string; status: string; revisions: { id: string; version: number; content: string; contentHash: string; status: string }[] }[];
  procedures: { id: string; title: string; status: string; versions: { id: string; version: number; status: string; definition: unknown; citations: { id: string; instructionIds: string[]; source: { title: string; url: string; status: string }; revision: { version: number; status: string } }[] }[] }[];
  audit: { id: string; entityType: string; entityId: string; action: string; createdAt: string }[];
};

export default function PracticeAdmin({ initial }: { initial: Data }) {
  const [data, setData] = useState<Data>(initial);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function load() {
    try {
      const response = await fetch("/api/pratiche/admin", { cache: "no-store" });
      if (!response.ok) throw new Error("Non è stato possibile caricare le revisioni.");
      setData(await response.json());
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Errore di rete."); }
  }
  async function act(payload: Record<string, string>) {
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/pratiche/admin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Operazione non riuscita.");
      await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Errore di rete."); }
    finally { setBusy(false); }
  }
  return <div className="space-y-8 py-6">
    {error && <p role="alert" className="text-sm text-danger">{error}</p>}
    <section><h2 className="text-xl font-bold">Fonti</h2><div className="mt-3 space-y-4">{data.sources.map((source) => <article key={source.id} className="rounded-xl border border-line bg-white p-5"><h3 className="font-semibold">{source.title}</h3><p className="text-sm text-muted">{source.authority} · {source.status}</p><a href={source.url} target="_blank" rel="noopener noreferrer" className="mt-2 block break-all text-sm text-brand underline">Apri la fonte originale</a>{source.revisions.map((revision) => <div key={revision.id} className="mt-4 border-t border-line pt-3"><p className="text-xs font-semibold">Revisione {revision.version} · {revision.status}</p><p className="mt-2 whitespace-pre-wrap text-sm">{revision.content}</p><p className="mt-2 break-all font-mono text-xs text-muted">SHA-256: {revision.contentHash}</p>{revision.status === "PENDING_REVIEW" && <button type="button" disabled={busy} onClick={() => void act({ action: "verifySource", sourceId: source.id, revisionId: revision.id })} className="mt-3 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Verifica revisione</button>}</div>)}</article>)}</div></section>
    <section><h2 className="text-xl font-bold">Procedure</h2><div className="mt-3 space-y-4">{data.procedures.map((procedure) => <article key={procedure.id} className="rounded-xl border border-line bg-white p-5"><h3 className="font-semibold">{procedure.title}</h3><p className="text-sm text-muted">{procedure.status}</p>{procedure.versions.map((version) => <div key={version.id} className="mt-3 border-t border-line pt-3"><p className="text-sm">Versione {version.version} · {version.status}</p><details className="mt-2"><summary className="cursor-pointer text-sm text-brand">Mostra la definizione</summary><pre className="mt-2 overflow-auto whitespace-pre-wrap text-xs">{JSON.stringify(version.definition, null, 2)}</pre></details><ul className="mt-2 space-y-2 text-xs">{version.citations.map((citation) => <li key={citation.id}><a href={citation.source.url} target="_blank" rel="noopener noreferrer" className="text-brand underline">{citation.source.title}</a> · revisione {citation.revision.version} ({citation.revision.status}) · istruzioni: {citation.instructionIds.join(", ")}</li>)}</ul>{["DRAFT", "PENDING_REVIEW"].includes(version.status) && <button type="button" disabled={busy} onClick={() => void act({ action: "publish", versionId: version.id })} className="mt-3 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Pubblica versione</button>}{version.status === "PUBLISHED" && <button type="button" disabled={busy} onClick={() => void act({ action: "retire", versionId: version.id })} className="mt-3 rounded-lg border border-line px-4 py-2 text-sm font-semibold disabled:opacity-50">Ritira versione</button>}</div>)}</article>)}</div></section>
    <section><h2 className="text-xl font-bold">Ultime modifiche</h2><ul className="mt-3 space-y-2 text-sm">{data.audit.map((entry) => <li key={entry.id} className="rounded-lg border border-line bg-white p-3">{entry.action} · {entry.entityType} · {entry.entityId} · {new Date(entry.createdAt).toLocaleString("it-IT")}</li>)}</ul></section>
  </div>;
}
