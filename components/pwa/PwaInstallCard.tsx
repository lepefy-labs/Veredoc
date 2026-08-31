"use client";

import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

const DISMISS_KEY = "veredoc:pwa-install-dismissed";

export default function PwaInstallCard() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIos, setIsIos] = useState(false);
  const [isStandalone, setIsStandalone] = useState(true);
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    function handleBeforeInstallPrompt(event: Event) {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    }

    function handleInstalled() {
      setIsStandalone(true);
      setInstallPrompt(null);
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleInstalled);

    const frame = window.requestAnimationFrame(() => {
      const standalone = window.matchMedia("(display-mode: standalone)").matches
        || ("standalone" in navigator && Boolean((navigator as Navigator & { standalone?: boolean }).standalone));
      const ios = /iphone|ipad|ipod/.test(navigator.userAgent.toLowerCase());

      setIsStandalone(standalone);
      setDismissed(window.localStorage.getItem(DISMISS_KEY) === "1");
      setIsIos(ios);
    });

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  if (isStandalone || dismissed || (!installPrompt && !isIos)) {
    return null;
  }

  async function install() {
    if (!installPrompt) return;
    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    if (choice.outcome === "accepted") {
      setInstallPrompt(null);
    }
  }

  function dismiss() {
    window.localStorage.setItem(DISMISS_KEY, "1");
    setDismissed(true);
  }

  return (
    <section className="rounded-2xl border border-brand/20 bg-brand-soft p-4 sm:p-5" aria-label="Installa Veredoc">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand text-white" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="1.8">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v12m0 0 4-4m-4 4-4-4M5 18h14" />
          </svg>
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-ink">Porta Veredoc sul telefono</p>
          <p className="mt-1 text-sm leading-6 text-muted">
            {isIos
              ? "Su iPhone: apri Condividi in Safari e scegli “Aggiungi alla schermata Home”."
              : "Installalo come app per aprirlo dalla schermata Home e arrivare più velocemente ai tuoi documenti."}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {!isIos && installPrompt && (
              <button onClick={install} className="min-h-11 rounded-xl bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand">
                Installa Veredoc
              </button>
            )}
            <button onClick={dismiss} className="min-h-11 rounded-xl px-3 text-sm font-medium text-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand">
              Non ora
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
