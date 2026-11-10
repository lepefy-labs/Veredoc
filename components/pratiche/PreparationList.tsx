"use client";

import { useId, useState } from "react";
import type { Preparation } from "@/lib/pratiche/plain-language";

export default function PreparationList({ preparation, embedded = false }: { preparation: Preparation; embedded?: boolean }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const id = useId();
  return <section aria-label={embedded ? "Dati e documenti da tenere pronti" : undefined} className={embedded ? "" : "rounded-xl border border-line bg-white p-5"}>
    {!embedded && <h2 className="font-semibold">Dati e documenti da tenere pronti</h2>}
    <ul className="mt-3 divide-y divide-line">
      {preparation.items.map((item, index) => <li key={item.title} className="py-2.5">
        <div className="flex min-h-10 items-center justify-between gap-3">
          <span className="text-sm font-medium text-ink">{item.title}</span>
          <button type="button" aria-label={`Spiegazione: ${item.title}`} aria-expanded={openIndex === index} aria-controls={`${id}-${index}`} onClick={() => setOpenIndex(openIndex === index ? null : index)} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-line text-sm font-bold text-brand hover:bg-brand-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand">?</button>
        </div>
        <p id={`${id}-${index}`} hidden={openIndex !== index} className="pb-1 pr-10 text-sm leading-6 text-muted">{item.detail}</p>
      </li>)}
    </ul>
    <p className="mt-2 text-xs leading-5 text-muted">{preparation.note}</p>
  </section>;
}
