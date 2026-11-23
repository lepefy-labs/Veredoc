import type { dsuPreparation } from "@/lib/pratiche/dsu-preparation";
import { isOfficialUrl } from "@/lib/pratiche/engine";

type Props = {
  preparation: ReturnType<typeof dsuPreparation>;
  nextStep?: string;
  message: string;
  sources: { url: string; title: string }[];
  onContinue?: () => void;
};

export default function DsuPreparation({ preparation, nextStep, message, sources, onContinue }: Props) {
  const { questions, tasks, documents } = preparation;
  const officialSources = [...new Map(sources.filter(({ url }) => isOfficialUrl(url)).map((source) => [source.url, source])).values()];

  return (
    <section aria-labelledby="dsu-preparation-title" className="mt-5 rounded-xl border border-line bg-white p-5">
      <h2 id="dsu-preparation-title" className="text-lg font-semibold text-ink">Cosa manca alla mia DSU?</h2>
      <p className="mt-2 text-sm text-muted">{message}</p>
      {nextStep && <p className="mt-2 text-sm font-semibold text-ink">{nextStep}</p>}
      {onContinue && (
        <button type="button" onClick={onContinue} aria-controls="case-current-step" className="mt-2 min-h-11 text-sm font-semibold text-brand underline">
          Vai al prossimo passo
        </button>
      )}
      {questions.length > 1 && <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-muted">{questions.slice(1).map(({ id, title }) => <li key={id}>{title}</li>)}</ul>}
      {tasks.length > 0 && (
        <details className="mt-3 text-sm">
          <summary className="cursor-pointer font-semibold text-brand">Passaggi da completare</summary>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-muted">{tasks.map(({ id, title }) => <li key={id}>{title}</li>)}</ul>
        </details>
      )}
      {documents.length > 0 && (
        <div className="mt-4">
          <h3 className="text-sm font-semibold text-ink">Requisiti documentali</h3>
          <ul className="mt-2 divide-y divide-line border-y border-line">{documents.map((document) => (
            <li key={document.id} className="py-2 text-sm">
              <span className="block font-medium text-ink">{document.title}</span>
              <span className="text-muted">
                {document.required ? "Richiesto" : "Facoltativo"} · {document.done ? "Passaggio completato" : "Da completare"}
                {document.linked !== null && (document.linked ? " · File collegato" : " · Nessun file collegato")}
              </span>
            </li>
          ))}</ul>
          {documents.some(({ linked }) => linked === true) && (
            <p className="mt-2 text-xs text-muted">Controlla che i file collegati rispondano alle richieste dell’ente.</p>
          )}
        </div>
      )}
      {officialSources.length > 0 && (
        <details className="mt-3 text-sm">
          <summary className="cursor-pointer font-semibold text-brand">Fonti per la DSU</summary>
          <ul className="mt-2 space-y-1">{officialSources.map(({ url, title }) => (
            <li key={url}><a href={url} target="_blank" rel="noopener noreferrer" className="flex min-h-11 items-center text-brand underline">{title}</a></li>
          ))}</ul>
        </details>
      )}
    </section>
  );
}
