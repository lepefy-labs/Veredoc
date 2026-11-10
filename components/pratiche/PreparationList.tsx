import type { Preparation } from "@/lib/pratiche/plain-language";

export default function PreparationList({ preparation }: { preparation: Preparation }) {
  return <section className="rounded-xl border border-line bg-white p-5">
    <h2 className="font-semibold">Dati e documenti da tenere pronti</h2>
    <ul className="mt-4 space-y-4">
      {preparation.items.map((item) => <li key={item.title} className="border-l-2 border-brand/30 pl-3">
        <p className="text-sm font-semibold text-ink">{item.title}</p>
        <p className="mt-1 text-sm leading-6 text-muted">{item.detail}</p>
      </li>)}
    </ul>
    <p className="mt-4 text-xs leading-5 text-muted">{preparation.note}</p>
  </section>;
}
