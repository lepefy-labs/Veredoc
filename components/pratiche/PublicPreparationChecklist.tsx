"use client";

import { useState, useSyncExternalStore } from "react";
import type { PracticalGuide } from "@/lib/pratiche/guide-content";

const changed = "veredoc:checklist-changed";

function subscribe(listener: () => void) {
  window.addEventListener("storage", listener);
  window.addEventListener(changed, listener);
  return () => {
    window.removeEventListener("storage", listener);
    window.removeEventListener(changed, listener);
  };
}

function readStoredItems(value: string): string[] {
  try {
    const items: unknown = JSON.parse(value);
    return Array.isArray(items) ? items.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

export default function PublicPreparationChecklist({ edition, documents }: {
  edition: string;
  documents: PracticalGuide["documents"];
}) {
  const storageKey = `veredoc:preparation:${edition}`;
  const [temporaryItems, setTemporaryItems] = useState<string[] | null>(null);
  const stored = useSyncExternalStore(subscribe, () => {
    try {
      return window.localStorage.getItem(storageKey) ?? "";
    } catch {
      return "";
    }
  }, () => "");
  const checkedItems = temporaryItems ?? readStoredItems(stored);
  const count = documents.filter(({ title }) => checkedItems.includes(title)).length;

  function update(title: string, checked: boolean) {
    const items = checked ? [...new Set([...checkedItems, title])] : checkedItems.filter((item) => item !== title);
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(items));
      setTemporaryItems(null);
      window.dispatchEvent(new Event(changed));
    } catch {
      setTemporaryItems(items);
    }
  }

  return (
    <>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 print:hidden">
        <div>
          <p className="text-sm leading-6 text-muted">
            Spunta solo le voci che servono al tuo caso. Se il browser lo consente, le spunte restano su questo dispositivo.
          </p>
          <p role="status" className="mt-1 text-sm font-semibold text-ink">{count === 1 ? "1 voce spuntata" : `${count} voci spuntate`} su {documents.length}</p>
        </div>
        <button type="button" onClick={() => window.print()} className="min-h-11 rounded-lg border border-line px-3 text-sm font-semibold text-brand hover:bg-brand-soft">
          Stampa la guida
        </button>
      </div>
      <ul className="mt-4 space-y-4">
        {documents.map(({ title, detail }, index) => {
          const checked = checkedItems.includes(title);
          const noteId = `preparation-checklist-note-${index}`;

          return (
            <li key={title} className="print:break-inside-avoid">
              <label className="flex min-h-11 cursor-pointer items-start gap-2.5 text-sm font-semibold text-ink print:min-h-0">
                <input type="checkbox" checked={checked} onChange={(event) => update(title, event.currentTarget.checked)}
                  aria-describedby={noteId} className="mt-0.5 size-5 shrink-0 accent-brand print:hidden" />
                <span aria-hidden="true" className="hidden print:inline">{checked ? "[✓]" : "[ ]"}</span>
                <span>{title}</span>
              </label>
              <p id={noteId} className="pl-7 text-sm leading-6 text-muted">{detail}</p>
            </li>
          );
        })}
      </ul>
    </>
  );
}
