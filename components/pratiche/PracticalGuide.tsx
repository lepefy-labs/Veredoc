import type { PracticalGuide as Guide } from "@/lib/pratiche/guide-content";
import PublicPreparationChecklist from "./PublicPreparationChecklist";

export default function PracticalGuide({ guide, checklistEdition }: { guide: Guide; checklistEdition?: string }) {
  return (
    <div className="mt-6 space-y-5">
      <section aria-labelledby="guide-destination" className="rounded-xl border border-brand/20 bg-brand-soft p-5 sm:p-6">
        <h2 id="guide-destination" className="text-lg font-semibold text-ink">{guide.destinationHeading ?? "Dove presentare la richiesta"}</h2>
        <p className="mt-2 text-sm leading-6 text-ink">{guide.destination}</p>
        <a href={guide.link.href} data-guide-print-url={guide.link.href} className="mt-4 inline-flex min-h-11 items-center rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark">
          {guide.link.label}
        </a>
        <p className="mt-4 text-sm leading-6 text-muted">{guide.alternative}</p>
      </section>

      <section aria-labelledby="guide-documents" className="rounded-xl border border-line bg-white p-5 sm:p-6">
        <h2 id="guide-documents" className="text-lg font-semibold text-ink">Documenti e dati da preparare</h2>
        {checklistEdition ? (
          <PublicPreparationChecklist key={checklistEdition} edition={checklistEdition} documents={guide.documents} />
        ) : <dl className="mt-4 space-y-4">
          {guide.documents.map(({ title, detail }) => (
            <div key={title}>
              <dt className="text-sm font-semibold text-ink">{title}</dt>
              <dd className="mt-1 text-sm leading-6 text-muted">{detail}</dd>
            </div>
          ))}
        </dl>}
      </section>

      <section aria-labelledby="guide-steps" className="rounded-xl border border-line bg-white p-5 sm:p-6">
        <h2 id="guide-steps" className="text-lg font-semibold text-ink">{guide.stepsHeading ?? "Passaggi sul portale ufficiale"}</h2>
        <ol className="mt-4 list-decimal space-y-4 pl-5 marker:font-semibold marker:text-brand">
          {guide.steps.map(({ title, detail }) => (
            <li key={title} className="pl-1 print:break-inside-avoid">
              <p className="text-sm font-semibold text-ink">{title}</p>
              <p className="mt-1 text-sm leading-6 text-muted">{detail}</p>
            </li>
          ))}
        </ol>
        <a href={guide.source.href} data-guide-print-url={guide.source.href} className="mt-5 inline-flex min-h-11 items-center text-sm font-semibold text-brand underline">
          {guide.source.label}
        </a>
      </section>
      {guide.example && (
        <section aria-labelledby="guide-example" className="rounded-xl border border-line bg-white p-5 sm:p-6">
          <h2 id="guide-example" className="text-lg font-semibold text-ink">{guide.example.title}</h2>
          <p id="guide-example-details" className="mt-2 text-sm leading-6 text-muted">{guide.example.detail}</p>
          <table aria-labelledby="guide-example" aria-describedby="guide-example-details" className="mt-4 w-full text-left text-sm text-ink">
            <thead>
              <tr className="border-b border-line">
                <th scope="col" className="py-2 pr-2">Voce</th>
                <th scope="col" className="py-2 pr-2">Calcolo</th>
                <th scope="col" className="py-2 text-right">Importo</th>
              </tr>
            </thead>
            <tbody>
              {guide.example.rows.map(({ label, calculation, amount }) => (
                <tr key={label} className="border-b border-line last:border-0 last:bg-brand-soft print:break-inside-avoid">
                  <th scope="row" className="py-2 pr-2 font-semibold">{label}</th>
                  <td className="py-2 pr-2">{calculation}</td>
                  <td className="whitespace-nowrap py-2 text-right font-semibold">{amount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}
