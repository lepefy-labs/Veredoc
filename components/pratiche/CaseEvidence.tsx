"use client";

import { useEffect, useState } from "react";

type Preview = { id: string; fileName: string; createdAt: string };
type Evidence = { linked: Preview[]; available: Preview[]; canAttach: boolean; hasMore: boolean };

const date = new Intl.DateTimeFormat("it-IT", { dateStyle: "short", timeZone: "Europe/Rome" });

export default function CaseEvidence({ caseId, stepId }: { caseId: string; stepId: string }) {
  const [data, setData] = useState<Evidence | null>(null);
  const [offset, setOffset] = useState(0);
  const [reload, setReload] = useState(0);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(true);
  const [selected, setSelected] = useState("");
  const endpoint = `/api/pratiche/cases/${encodeURIComponent(caseId)}/documenti`;

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const url = `${endpoint}?${new URLSearchParams({ step: stepId, offset: String(offset) })}`;
        const response = await fetch(url, { signal: controller.signal, cache: "no-store" });
        if (!response.ok) throw new Error("Lettura non riuscita");
        const result: Evidence = await response.json();
        if (!controller.signal.aborted) setData(result);
      } catch {
        if (!controller.signal.aborted) setError("Non è stato possibile caricare i documenti.");
      } finally {
        if (!controller.signal.aborted) setPending(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [endpoint, offset, reload, stepId]);

  function showPage(next: number) {
    setPending(true);
    setError("");
    setSelected("");
    setOffset(next);
    setReload((count) => count + 1);
  }

  async function change(action: "link" | "unlink", documentId: string) {
    setPending(true);
    setError("");
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, documentId, step: stepId }),
      });
      if (!response.ok) throw new Error("Scrittura non riuscita");
      showPage(0);
    } catch {
      setError("Non è stato possibile aggiornare il collegamento. Riprova.");
      setPending(false);
    }
  }

  return (
    <section aria-label="Documenti collegati" aria-busy={pending} className="mt-5 space-y-3 rounded-xl border border-line bg-page p-4">
      <h3 className="font-semibold text-ink">Documenti collegati</h3>
      {pending && <p role="status" className="text-sm text-muted">Aggiornamento dei documenti…</p>}
      {error && <div>
        <p role="alert" className="text-sm text-danger-dark">{error}</p>
        <button type="button" disabled={pending} onClick={() => showPage(offset)} className="min-h-11 text-sm font-semibold text-brand underline">Ricarica documenti</button>
      </div>}
      {data && <>
        {data.linked.length > 0 ? <ul className="space-y-2">
          {data.linked.map(({ id, fileName }) => <li key={id} className="flex flex-wrap items-center justify-between gap-x-4 break-all text-sm">
            <span>{fileName}</span>
            <button type="button" disabled={pending} onClick={() => void change("unlink", id)} aria-label={`Scollega ${fileName}`} className="min-h-11 font-semibold text-brand underline disabled:opacity-50">Scollega</button>
          </li>)}
        </ul> : <p className="text-sm text-muted">Nessun documento collegato.</p>}
        {data.linked.length > 0 && <p className="text-sm text-muted">Verifica che i file rispondano alle richieste dell’ente.</p>}
        {data.canAttach && <>
          {data.available.length > 0 ? <div className="space-y-2">
            <label htmlFor={`evidence-${stepId}`} className="block text-sm font-semibold">Scegli dall’archivio di questo profilo</label>
            <select id={`evidence-${stepId}`} value={selected} disabled={pending} onChange={(event) => setSelected(event.target.value)} className="min-h-11 w-full rounded-lg border border-line bg-white px-2 text-sm">
              <option value="">Seleziona un documento</option>
              {data.available.map(({ id, fileName, createdAt }) => <option key={id} value={id}>{fileName} · {date.format(new Date(createdAt))}</option>)}
            </select>
            <button type="button" disabled={pending || !selected} onClick={() => void change("link", selected)} className="min-h-11 rounded-lg bg-brand px-4 text-sm font-semibold text-white disabled:opacity-50">Collega documento</button>
          </div> : <p className="text-sm text-muted">Nessun altro file disponibile in questa pagina.</p>}
          {(offset > 0 || data.hasMore) && <div className="flex gap-4">
            {offset > 0 && <button type="button" disabled={pending} onClick={() => showPage(offset - 20)} className="min-h-11 text-sm font-semibold text-brand underline">File precedenti</button>}
            {data.hasMore && <button type="button" disabled={pending} onClick={() => showPage(offset + 20)} className="min-h-11 text-sm font-semibold text-brand underline">Altri file</button>}
          </div>}
        </>}
      </>}
    </section>
  );
}
