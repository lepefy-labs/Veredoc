import { BustaPagaData, PayrollCheck, PayrollVerification } from "@/types/bustapaga";

export function calcolaAliquotaEffettiva(busta: BustaPagaData): number {
  if (busta.stipendio_lordo === 0) return 0;
  const totale_trattenute = busta.irpef + busta.contributi_inps;
  return Math.round((totale_trattenute / busta.stipendio_lordo) * 1000) / 10;
}

export function calcolaRateoTfr(busta: BustaPagaData): number {
  return busta.tfr_maturato ?? Math.round((busta.stipendio_lordo / 13.5) * 100) / 100;
}

function pct(value: number, base: number): number | null {
  if (!Number.isFinite(value) || !Number.isFinite(base) || base <= 0) return null;
  return Math.round((value / base) * 1000) / 10;
}

function money(value: number): string {
  return value.toLocaleString("it-IT", { style: "currency", currency: "EUR" });
}

export function verificaBustaPaga(busta: BustaPagaData): PayrollVerification {
  const checks: PayrollCheck[] = [];
  let scostamentoQuadratura: number | null = null;

  if (busta.competenze_totali != null && busta.trattenute_totali != null) {
    const nettoAtteso = busta.competenze_totali - busta.trattenute_totali;
    scostamentoQuadratura = Math.round((busta.stipendio_netto - nettoAtteso) * 100) / 100;
    const tolleranza = Math.max(2, Math.abs(busta.stipendio_netto) * 0.01);

    if (Math.abs(scostamentoQuadratura) <= tolleranza) {
      checks.push({
        id: "quadratura-netto",
        level: "ok",
        title: "Netto coerente con i totali",
        summary: `Competenze meno trattenute torna sul netto entro ${money(tolleranza)} di tolleranza.`,
      });
    } else {
      checks.push({
        id: "quadratura-netto",
        level: "warning",
        title: "Il netto non quadra con i totali estratti",
        summary: `Lo scostamento è ${money(Math.abs(scostamentoQuadratura))}. Può dipendere da conguagli o voci non estratte: conviene verificare il cedolino.`,
      });
    }
  } else {
    checks.push({
      id: "quadratura-netto",
      level: "info",
      title: "Quadratura del netto non disponibile",
      summary: "Nel documento non sono stati trovati sia il totale competenze sia il totale trattenute.",
    });
  }

  const aliquotaContributiva = busta.imponibile_previdenziale != null
    ? pct(busta.contributi_inps, busta.imponibile_previdenziale)
    : null;

  if (aliquotaContributiva != null) {
    if (aliquotaContributiva < 5 || aliquotaContributiva > 15) {
      checks.push({
        id: "contributi",
        level: "warning",
        title: "Contributi fuori dall'intervallo ordinario",
        summary: `L'incidenza rilevata è ${aliquotaContributiva}%. Contratto, settore, agevolazioni o conguagli possono giustificarla: è una voce da controllare.`,
      });
    } else {
      checks.push({
        id: "contributi",
        level: "ok",
        title: "Contributi in un intervallo plausibile",
        summary: `Incidenza contributiva rilevata: ${aliquotaContributiva}% dell'imponibile previdenziale.`,
      });
    }
  }

  const incidenzaIrpef = busta.imponibile_fiscale != null ? pct(busta.irpef, busta.imponibile_fiscale) : null;
  if (incidenzaIrpef != null) {
    if (busta.irpef < 0 || busta.irpef > (busta.imponibile_fiscale ?? 0)) {
      checks.push({
        id: "irpef",
        level: "warning",
        title: "IRPEF da verificare",
        summary: "L'importo IRPEF estratto non è compatibile con l'imponibile fiscale del mese.",
      });
    } else {
      checks.push({
        id: "irpef",
        level: "info",
        title: "Incidenza IRPEF del mese",
        summary: `${incidenzaIrpef}% dell'imponibile fiscale. Il valore mensile da solo non basta a certificare l'imposta annuale: detrazioni, addizionali e conguagli possono modificarlo.`,
      });
    }
  }

  const rapportoNettoLordo = pct(busta.stipendio_netto, busta.stipendio_lordo);
  if (rapportoNettoLordo != null) {
    checks.push({
      id: "netto-lordo",
      level: "info",
      title: "Rapporto netto/lordo",
      summary: `Il netto equivale al ${rapportoNettoLordo}% del lordo indicato nel cedolino.`,
    });
  }

  if (busta.stipendio_lordo < 0 || busta.stipendio_netto < 0 || busta.contributi_inps < 0 || busta.irpef < 0) {
    checks.push({
      id: "valori-negativi",
      level: "warning",
      title: "Valori anomali rilevati",
      summary: "Uno o più importi principali risultano negativi. Potrebbe trattarsi di storni o conguagli, ma richiede verifica manuale.",
    });
  }

  const warnings = checks.filter((check) => check.level === "warning").length;
  const positives = checks.filter((check) => check.level === "ok").length;

  if (warnings > 0) {
    return {
      verdict: "da_verificare",
      title: `${warnings} ${warnings === 1 ? "elemento" : "elementi"} da verificare`,
      summary: "Veredoc ha trovato una o più incoerenze o valori fuori dagli intervalli di controllo. Non significa automaticamente che la busta paga sia errata.",
      checks,
      metrics: {
        aliquota_contributiva_effettiva: aliquotaContributiva,
        incidenza_irpef: incidenzaIrpef,
        rapporto_netto_lordo: rapportoNettoLordo,
        scostamento_quadratura: scostamentoQuadratura,
      },
      engineVersion: "payroll-coherence-v1",
    };
  }

  if (positives > 0) {
    return {
      verdict: "coerente",
      title: "Nessuna anomalia evidente",
      summary: "I controlli automatici disponibili sul cedolino risultano coerenti. Restano possibili casistiche contrattuali o fiscali non verificabili da un singolo documento.",
      checks,
      metrics: {
        aliquota_contributiva_effettiva: aliquotaContributiva,
        incidenza_irpef: incidenzaIrpef,
        rapporto_netto_lordo: rapportoNettoLordo,
        scostamento_quadratura: scostamentoQuadratura,
      },
      engineVersion: "payroll-coherence-v1",
    };
  }

  return {
    verdict: "dati_insufficienti",
    title: "Servono più dati per un controllo completo",
    summary: "Il cedolino è stato letto, ma mancano alcuni totali o imponibili utili ai controlli automatici di coerenza.",
    checks,
    metrics: {
      aliquota_contributiva_effettiva: aliquotaContributiva,
      incidenza_irpef: incidenzaIrpef,
      rapporto_netto_lordo: rapportoNettoLordo,
      scostamento_quadratura: scostamentoQuadratura,
    },
    engineVersion: "payroll-coherence-v1",
  };
}
