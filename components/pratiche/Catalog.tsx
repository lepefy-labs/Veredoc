"use client";

import { useState } from "react";
import Link from "next/link";

type Item = { slug: string; title: string; description: string; category: string; authority: string; available: boolean };

export default function Catalog({ items }: { items: Item[] }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("Tutte");
  const categories = ["Tutte", ...new Set(items.map((item) => item.category))];
  const filtered = items.filter((item) => (category === "Tutte" || item.category === category) && `${item.title} ${item.description} ${item.authority}`.toLocaleLowerCase("it").includes(query.trim().toLocaleLowerCase("it")));
  return <>
    <label htmlFor="practice-search" className="block text-sm font-semibold">Cerca una pratica</label>
    <input id="practice-search" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Per esempio: cambio di residenza" className="mt-2 w-full rounded-xl border border-line bg-white px-4 py-3 outline-brand" />
    <div className="mt-5 flex gap-2 overflow-x-auto pb-2" aria-label="Categorie">
      {categories.map((name) => <button key={name} type="button" onClick={() => setCategory(name)} aria-pressed={category === name} className={`shrink-0 rounded-full px-4 py-2 text-sm ${category === name ? "bg-brand text-white" : "border border-line bg-white text-ink"}`}>{name}</button>)}
    </div>
    {filtered.length === 0 ? <p className="mt-8 text-muted">Nessuna pratica trovata.</p> : <div className="mt-5 grid gap-4 sm:grid-cols-2">
      {filtered.map((item) => <article key={item.slug} className="rounded-2xl border border-line bg-white p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-brand">{item.category}</p>
        <h2 className="mt-2 text-lg font-bold">{item.title}</h2>
        <p className="mt-2 text-sm text-muted">{item.description}</p>
        <p className="mt-3 text-xs text-muted">Ente: {item.authority}</p>
        <p className="mt-1 text-xs font-medium">{item.available ? "Fonti verificate" : "In preparazione"}</p>
        <Link href={`/pratiche/${item.slug}`} className="mt-4 inline-flex min-h-11 items-center rounded-lg bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-dark">{item.available ? "Inizia la pratica" : "Dettagli"}</Link>
      </article>)}
    </div>}
  </>;
}
