type Props = {
  id: string;
  label?: string;
  query?: string;
};

export default function GuideSearchForm({ id, label = "Cerca una guida", query = "" }: Props) {
  return (
    <form action="/guide" method="get" role="search" className="max-w-2xl rounded-2xl border border-brand/20 bg-brand-soft p-4 sm:p-5">
      <label htmlFor={id} className="text-sm font-semibold text-ink">{label}</label>
      <div className="mt-2 flex gap-2">
        <input id={id} name="q" type="search" defaultValue={query} placeholder="Es. cambio di residenza" maxLength={120}
          className="min-h-12 min-w-0 flex-1 rounded-lg border border-muted bg-white px-3 text-base text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand" />
        <button type="submit" className="min-h-12 rounded-lg bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand">Cerca</button>
      </div>
    </form>
  );
}
