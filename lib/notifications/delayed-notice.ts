// Avviso "Stiamo ancora analizzando il tuo documento" senza scheduler esterni.
//
// Il timer parte insieme al worker nello stesso after() dell'upload/riprova manuale
// (maxDuration 300 s): allo scadere della soglia accoda l'avviso per quel documento,
// solo se è ancora PENDING/PROCESSING (ricontrollo in SQL), e lo invia subito.
// - analisi conclusa prima della soglia → timer annullato, nessun avviso;
// - worker terminato senza esito finale (retry in coda) → si attende comunque la soglia;
// - funzione interrotta prima della soglia → il job di recovery accoda l'avviso entro 30 min.

export interface DelayedNoticeTimer {
  // Esito finale raggiunto: annulla il timer se non è ancora scattato.
  cancel(): Promise<void>;
  // Attende lo scatto del timer (e il relativo invio).
  wait(): Promise<void>;
}

export function startDelayedNoticeTimer(
  delayMs: number,
  fire: () => Promise<void>,
  timers: { set: typeof setTimeout; clear: typeof clearTimeout } = { set: setTimeout, clear: clearTimeout }
): DelayedNoticeTimer {
  let fired = false;
  let settle!: () => void;
  const done = new Promise<void>((resolve) => {
    settle = resolve;
  });
  const handle = timers.set(() => {
    fired = true;
    fire().catch(() => undefined).finally(settle);
  }, delayMs);

  return {
    async cancel() {
      if (fired) return done;
      timers.clear(handle);
      settle();
    },
    wait: () => done,
  };
}
