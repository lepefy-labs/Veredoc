import Link from "next/link";
import PricingCardPro from "@/components/PricingCardPro";
import { TEXTS } from "@/lib/config/texts";
import { praticheEnabled } from "@/lib/pratiche/feature";

const procedures = [
  { title: "Cambio di residenza", description: "Scopri quali dati preparare per comunicare il nuovo indirizzo al Comune.", href: "/pratiche/cambio-residenza", category: "Anagrafe" },
  { title: "Certificati anagrafici", description: "Scopri come chiedere online il certificato che ti serve.", href: "/pratiche/certificati-anagrafici", category: "Anagrafe" },
  { title: "Prepara i dati per l'ISEE", description: "Tieni pronti i dati della famiglia, dei redditi e dei beni.", href: "/pratiche/preparazione-dsu-isee", category: "Famiglia" },
];

const practiceSteps = [
  "Verifica il tuo caso",
  "Tieni pronti dati e documenti",
  "Segui i passaggi sul portale ufficiale",
];

export default function Home() {
  const praticheAvailable = praticheEnabled();
  return (
    <main className="w-full flex-1">
      <section className="border-b border-line bg-white">
        <div className={`mx-auto grid w-full max-w-6xl gap-10 px-4 pb-16 pt-14 sm:px-6 sm:pt-20 lg:items-center lg:gap-16 lg:pb-20 lg:pt-24 ${praticheAvailable ? "lg:grid-cols-[1.05fr_0.95fr]" : ""}`}>
          <div>
            <p className="inline-flex rounded-full border border-brand/15 bg-brand-soft px-3 py-1.5 text-xs font-bold uppercase tracking-[0.14em] text-brand">{praticheAvailable ? "Documenti e pratiche, nello stesso posto" : "I tuoi documenti, più chiari"}</p>
            <h1 className="mt-6 max-w-2xl text-4xl font-bold leading-[1.12] tracking-tight text-ink sm:text-5xl lg:text-[3.55rem]">{praticheAvailable ? "Capisci i documenti. Porta avanti le pratiche." : "Capisci meglio bollette e buste paga."}</h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-muted">{praticheAvailable ? "Veredoc ti aiuta a leggere bollette e buste paga e a preparare le pratiche passo dopo passo. Sai da dove iniziare, cosa serve e cosa manca." : "Carica un documento: Veredoc spiega le voci principali e segnala i punti che meritano una verifica."}</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              {praticheAvailable && <Link href="/pratiche" className="inline-flex min-h-12 items-center justify-center rounded-xl bg-brand px-6 font-semibold text-white transition-colors hover:bg-brand-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand">Esplora Pratiche <span aria-hidden="true" className="ml-2">→</span></Link>}
              <Link href="/register" className="inline-flex min-h-12 items-center justify-center rounded-xl border border-line bg-white px-6 font-semibold text-ink transition-colors hover:border-brand hover:text-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand">Crea un account gratuito</Link>
            </div>
            {praticheAvailable && <p className="mt-3 text-sm text-muted">Per usare Pratiche serve un account Veredoc.</p>}
          </div>
          {praticheAvailable && <div className="rounded-[2rem] bg-brand-soft p-4 sm:p-7">
            <div className="overflow-hidden rounded-2xl border border-line bg-white shadow-xl shadow-brand/10">
              <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4 sm:px-6">
                <div><p className="text-xs font-bold uppercase tracking-[0.14em] text-brand">Veredoc Pratiche</p><p className="mt-1 text-sm text-muted">Un percorso alla volta, con ordine</p></div>
                <span className="rounded-full bg-brand-soft px-3 py-1 text-xs font-semibold text-brand">Guida</span>
              </div>
              <div className="p-5 sm:p-6">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">Esempio di percorso</p>
                <h2 className="mt-2 text-2xl font-bold tracking-tight text-ink">Cambio di residenza</h2>
                <p className="mt-2 text-sm leading-6 text-muted">Scopri cosa ti serve prima di comunicare il nuovo indirizzo.</p>
                <ol className="mt-6 space-y-3">
                  {practiceSteps.map((step, index) => <li key={step} className="flex items-center gap-3 rounded-xl border border-line bg-page px-4 py-3 text-sm font-medium text-ink"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-xs font-bold text-brand shadow-sm">{index + 1}</span>{step}</li>)}
                </ol>
                <Link href="/pratiche/cambio-residenza" className="mt-6 inline-flex min-h-11 items-center font-semibold text-brand hover:text-brand-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand">Apri questa guida <span aria-hidden="true" className="ml-2">→</span></Link>
              </div>
            </div>
            <p className="mt-4 text-center text-xs font-medium text-muted">Fonti ufficiali consultabili in ogni pratica</p>
          </div>}
        </div>
      </section>

      <section id="funzioni" className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
        <div className="max-w-2xl"><p className="text-xs font-bold uppercase tracking-[0.14em] text-brand">La piattaforma</p><h2 className="mt-3 text-3xl font-bold tracking-tight text-ink sm:text-4xl">{praticheAvailable ? "Scegli da cosa partire" : "Analizza i tuoi documenti"}</h2>{praticheAvailable && <p className="mt-3 text-base leading-7 text-muted">Due strumenti per problemi diversi, con un accesso unico.</p>}</div>
        <div className={`mt-8 grid gap-5 ${praticheAvailable ? "lg:grid-cols-2" : ""}`}>
          {praticheAvailable && <article className="flex flex-col rounded-3xl border border-brand/20 bg-brand-soft p-7 sm:p-9">
            <span className="self-start rounded-full bg-brand px-3 py-1 text-xs font-bold uppercase tracking-wide text-white">Pratiche</span>
            <h3 className="mt-6 text-2xl font-bold tracking-tight text-ink">Prepara una pratica, passo dopo passo</h3>
            <p className="mt-3 leading-7 text-muted">Scegli la pratica, scopri quali dati e documenti tenere pronti e segui i passaggi per il tuo caso. Puoi aprire le informazioni ufficiali quando vuoi.</p>
            <ul className="mt-6 space-y-2 text-sm font-medium text-ink"><li>✓ Indicazioni chiare per il tuo caso</li><li>✓ Elenco di dati e documenti da preparare</li><li>✓ Link ai siti ufficiali</li></ul>
            <Link href="/pratiche" className="mt-8 inline-flex min-h-12 items-center justify-center self-start rounded-xl bg-brand px-5 font-semibold text-white transition-colors hover:bg-brand-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand">Vai a Pratiche <span aria-hidden="true" className="ml-2">→</span></Link>
          </article>}
          <article className="flex flex-col rounded-3xl border border-line bg-white p-7 sm:p-9">
            <span className="self-start rounded-full bg-chip px-3 py-1 text-xs font-bold uppercase tracking-wide text-ink">Analisi documenti</span>
            <h3 className="mt-6 text-2xl font-bold tracking-tight text-ink">Leggi meglio bollette e buste paga</h3>
            <p className="mt-3 leading-7 text-muted">Carica un documento. Veredoc riconosce il tipo, spiega le voci principali e segnala i punti che meritano una verifica.</p>
            <ul className="mt-6 space-y-2 text-sm font-medium text-ink"><li>✓ Bollette luce, gas e internet</li><li>✓ Buste paga e controlli di coerenza</li><li>✓ Analisi conservate nel tuo account</li></ul>
            <Link href="/analyze" className="mt-8 inline-flex min-h-12 items-center justify-center self-start rounded-xl border border-brand px-5 font-semibold text-brand transition-colors hover:bg-brand-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand">Analizza un documento <span aria-hidden="true" className="ml-2">→</span></Link>
          </article>
        </div>
      </section>

      {praticheAvailable && <section className="border-y border-line bg-white">
        <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
          <div className="flex flex-wrap items-end justify-between gap-5">
            <div className="max-w-2xl"><p className="text-xs font-bold uppercase tracking-[0.14em] text-brand">Pratiche disponibili</p><h2 className="mt-3 text-3xl font-bold tracking-tight text-ink sm:text-4xl">Inizia da una guida concreta</h2><p className="mt-3 leading-7 text-muted">Tre percorsi già disponibili, con passaggi e fonti verificati.</p></div>
            <Link href="/pratiche" className="inline-flex min-h-11 items-center font-semibold text-brand hover:text-brand-dark">Vedi tutte le pratiche <span aria-hidden="true" className="ml-2">→</span></Link>
          </div>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {procedures.map((procedure) => <article key={procedure.href} className="flex h-full flex-col rounded-2xl border border-line bg-page p-6 transition-colors hover:border-brand/40">
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-brand">{procedure.category}</p>
              <h3 className="mt-4 text-xl font-bold text-ink">{procedure.title}</h3>
              <p className="mt-2 flex-1 text-sm leading-6 text-muted">{procedure.description}</p>
              <Link href={procedure.href} className="mt-6 inline-flex min-h-11 items-center self-start font-semibold text-brand hover:text-brand-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand">Apri la guida <span aria-hidden="true" className="ml-2">→</span></Link>
            </article>)}
          </div>
          <p className="mt-5 text-sm text-muted">Veredoc ti aiuta a preparare la pratica. La presentazione avviene sul portale dell’ente competente.</p>
        </div>
      </section>}

      <section id="prezzi" className="mx-auto w-full max-w-4xl px-4 py-16 sm:px-6 sm:py-20">
        <div className="text-center"><p className="text-xs font-bold uppercase tracking-[0.14em] text-brand">Analisi documenti</p><h2 className="mt-3 text-3xl font-bold tracking-tight text-ink sm:text-4xl">{TEXTS.pricing.title}</h2><p className="mt-3 text-muted">Questi piani riguardano l’analisi di bollette e buste paga.</p></div>
        <div className="mt-10 grid gap-6 sm:grid-cols-2">
          <div className="flex h-full flex-col rounded-2xl border border-line bg-white p-6">
            <span className="mb-4 self-start rounded-full bg-chip px-2 py-0.5 text-[11px] font-semibold text-muted">{TEXTS.pricing.free.badge}</span>
            <p><span className="font-mono text-3xl font-bold text-ink">{TEXTS.pricing.free.price}</span><span className="text-sm text-muted"> / {TEXTS.pricing.free.period}</span></p>
            <ul className="mt-6 flex-1 space-y-2.5 text-sm text-ink">{TEXTS.pricing.free.features.map((feature) => <li key={feature} className="flex items-start gap-2"><span aria-hidden="true" className="font-bold text-success">✓</span><span>{feature}</span></li>)}</ul>
            <Link href="/register" className="mt-6 inline-flex min-h-12 items-center justify-center rounded-lg border border-brand px-5 font-semibold text-brand transition-colors hover:bg-brand-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand">{TEXTS.pricing.free.cta}</Link>
          </div>
          <PricingCardPro />
        </div>
        <p className="mt-8 text-center text-sm text-muted">{TEXTS.pricing.dataNote}</p>
      </section>
    </main>
  );
}
