import type { BollettaRaw } from "@/types/bolletta";
import type { BustaPagaData, PayrollBalance, PayrollPeriodEvent } from "@/types/bustapaga";

const BILL_TYPES = new Set(["luce", "gas", "internet", "telefonia"]);
const DETECTED_BILL_TYPES = new Set(["luce", "gas", "internet"]);
const PAYROLL_BALANCE_TYPES = new Set(["ferie", "permessi", "rol", "ex_festivita", "altro"]);
const PAYROLL_EVENT_TYPES = new Set(["straordinario", "premio", "assenza", "malattia", "ferie", "permesso", "altro"]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requireRecord(value: unknown, path: string): Record<string, unknown> {
  if (!isRecord(value)) throw new Error(`Output AI non valido: ${path} deve essere un oggetto.`);
  return value;
}

function requireString(value: unknown, path: string): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`Output AI non valido: ${path} deve essere una stringa non vuota.`);
  }
  return value;
}

function requireNumber(value: unknown, path: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`Output AI non valido: ${path} deve essere un numero finito.`);
  }
  return value;
}

function requireNullableNumber(value: unknown, path: string): number | null {
  if (value === null) return null;
  return requireNumber(value, path);
}

function requireNullableString(value: unknown, path: string): string | null {
  if (value === null) return null;
  if (typeof value !== "string") throw new Error(`Output AI non valido: ${path} deve essere una stringa o null.`);
  return value;
}

function requireArray(value: unknown, path: string): unknown[] {
  if (!Array.isArray(value)) throw new Error(`Output AI non valido: ${path} deve essere un array.`);
  return value;
}

function nullableSection(value: unknown, path: string): Record<string, unknown> {
  return value === null ? {} : requireRecord(value, path);
}

export function validateBollettaOutput(raw: unknown): BollettaRaw & { tipo_rilevato: "luce" | "gas" | "internet" } {
  const root = requireRecord(raw, "root");
  const detected = requireString(root.tipo_rilevato, "tipo_rilevato");
  if (!DETECTED_BILL_TYPES.has(detected)) {
    throw new Error("Output AI non valido: tipo_rilevato non è una bolletta supportata.");
  }

  const tipo = requireString(root.tipo, "tipo");
  if (!BILL_TYPES.has(tipo)) throw new Error("Output AI non valido: tipo bolletta non supportato.");

  const consumiRaw = root.consumi;
  let consumi: BollettaRaw["consumi"] = null;
  if (consumiRaw !== null) {
    const c = requireRecord(consumiRaw, "consumi");
    consumi = {
      valore: requireNumber(c.valore, "consumi.valore"),
      unita: requireString(c.unita, "consumi.unita"),
      mensile_stimato: requireNullableNumber(c.mensile_stimato, "consumi.mensile_stimato"),
    };
  }

  const materia = requireRecord(root.materia_energia, "materia_energia");
  const rete = nullableSection(root.rete_e_oneri, "rete_e_oneri");
  const imposte = nullableSection(root.imposte, "imposte");
  const altro = nullableSection(root.altro, "altro");

  const voci = requireArray(root.voci_dettaglio, "voci_dettaglio").map((item, index) => {
    const voce = requireRecord(item, `voci_dettaglio[${index}]`);
    const categoria = voce.categoria;
    if (categoria !== undefined && !["materia_energia", "rete_oneri", "imposte", "altro"].includes(String(categoria))) {
      throw new Error(`Output AI non valido: voci_dettaglio[${index}].categoria non supportata.`);
    }
    return {
      nome: requireString(voce.nome, `voci_dettaglio[${index}].nome`),
      importo: requireNumber(voce.importo, `voci_dettaglio[${index}].importo`),
      categoria: categoria as "materia_energia" | "rete_oneri" | "imposte" | "altro" | undefined,
      spiegazione: requireString(voce.spiegazione, `voci_dettaglio[${index}].spiegazione`),
    };
  });

  return {
    tipo_rilevato: detected as "luce" | "gas" | "internet",
    tipo: tipo as BollettaRaw["tipo"],
    fornitore: requireString(root.fornitore, "fornitore"),
    offerta_nome: root.offerta_nome == null ? undefined : requireString(root.offerta_nome, "offerta_nome"),
    periodo: requireString(root.periodo, "periodo"),
    periodo_giorni: requireNullableNumber(root.periodo_giorni, "periodo_giorni"),
    scadenza: root.scadenza === undefined ? undefined : requireNullableString(root.scadenza, "scadenza"),
    potenza_impegnata_kw:
      root.potenza_impegnata_kw === undefined
        ? undefined
        : requireNullableNumber(root.potenza_impegnata_kw, "potenza_impegnata_kw"),
    consumi,
    materia_energia: {
      quota_variabile_eur: requireNullableNumber(materia.quota_variabile_eur, "materia_energia.quota_variabile_eur"),
      quota_variabile_prezzo_kwh: requireNullableNumber(
        materia.quota_variabile_prezzo_kwh,
        "materia_energia.quota_variabile_prezzo_kwh"
      ),
      quota_fissa_eur: requireNullableNumber(materia.quota_fissa_eur, "materia_energia.quota_fissa_eur"),
      quota_fissa_mensile_eur: requireNullableNumber(
        materia.quota_fissa_mensile_eur,
        "materia_energia.quota_fissa_mensile_eur"
      ),
      totale_eur: requireNullableNumber(materia.totale_eur, "materia_energia.totale_eur"),
    },
    rete_e_oneri: {
      trasporto_rete_eur: requireNullableNumber(rete.trasporto_rete_eur ?? null, "rete_e_oneri.trasporto_rete_eur"),
      oneri_sistema_eur: requireNullableNumber(rete.oneri_sistema_eur ?? null, "rete_e_oneri.oneri_sistema_eur"),
      quota_potenza_eur: requireNullableNumber(rete.quota_potenza_eur ?? null, "rete_e_oneri.quota_potenza_eur"),
      totale_eur: requireNullableNumber(rete.totale_eur ?? null, "rete_e_oneri.totale_eur"),
    },
    imposte: {
      accise_eur: requireNullableNumber(imposte.accise_eur ?? null, "imposte.accise_eur"),
      iva_eur: requireNullableNumber(imposte.iva_eur ?? null, "imposte.iva_eur"),
      totale_eur: requireNullableNumber(imposte.totale_eur ?? null, "imposte.totale_eur"),
    },
    altro: {
      canone_rai_eur: requireNullableNumber(altro.canone_rai_eur ?? null, "altro.canone_rai_eur"),
      altri_eur: requireNullableNumber(altro.altri_eur ?? null, "altro.altri_eur"),
    },
    importo_totale: requireNumber(root.importo_totale, "importo_totale"),
    voci_dettaglio: voci,
  };
}

function validatePayrollBalances(value: unknown): PayrollBalance[] {
  if (value === undefined || value === null) return [];
  return requireArray(value, "saldi_assenze").map((item, index) => {
    const balance = requireRecord(item, `saldi_assenze[${index}]`);
    const tipo = requireString(balance.tipo, `saldi_assenze[${index}].tipo`);
    if (!PAYROLL_BALANCE_TYPES.has(tipo)) {
      throw new Error(`Output AI non valido: saldi_assenze[${index}].tipo non supportato.`);
    }
    return {
      tipo: tipo as PayrollBalance["tipo"],
      maturato: requireNullableNumber(balance.maturato ?? null, `saldi_assenze[${index}].maturato`),
      goduto: requireNullableNumber(balance.goduto ?? null, `saldi_assenze[${index}].goduto`),
      residuo: requireNullableNumber(balance.residuo ?? null, `saldi_assenze[${index}].residuo`),
      unita: requireNullableString(balance.unita ?? null, `saldi_assenze[${index}].unita`),
    };
  });
}

function validatePayrollEvents(value: unknown): PayrollPeriodEvent[] {
  if (value === undefined || value === null) return [];
  return requireArray(value, "eventi_periodo").map((item, index) => {
    const event = requireRecord(item, `eventi_periodo[${index}]`);
    const tipo = requireString(event.tipo, `eventi_periodo[${index}].tipo`);
    if (!PAYROLL_EVENT_TYPES.has(tipo)) {
      throw new Error(`Output AI non valido: eventi_periodo[${index}].tipo non supportato.`);
    }
    return {
      tipo: tipo as PayrollPeriodEvent["tipo"],
      descrizione: requireString(event.descrizione, `eventi_periodo[${index}].descrizione`),
      quantita: requireNullableNumber(event.quantita ?? null, `eventi_periodo[${index}].quantita`),
      unita: requireNullableString(event.unita ?? null, `eventi_periodo[${index}].unita`),
      importo: requireNullableNumber(event.importo ?? null, `eventi_periodo[${index}].importo`),
    };
  });
}

export function validateBustaPagaOutput(raw: unknown): BustaPagaData & { tipo_rilevato: "busta_paga" } {
  const root = requireRecord(raw, "root");
  if (root.tipo_rilevato !== "busta_paga") {
    throw new Error("Output AI non valido: tipo_rilevato non è una busta paga supportata.");
  }

  const voci = requireArray(root.voci, "voci").map((item, index) => {
    const voce = requireRecord(item, `voci[${index}]`);
    const tipo = voce.tipo;
    if (tipo !== "competenza" && tipo !== "trattenuta") {
      throw new Error(`Output AI non valido: voci[${index}].tipo non supportato.`);
    }
    return {
      nome: requireString(voce.nome, `voci[${index}].nome`),
      importo: requireNumber(voce.importo, `voci[${index}].importo`),
      tipo: tipo as "competenza" | "trattenuta",
      spiegazione: requireString(voce.spiegazione, `voci[${index}].spiegazione`),
    };
  });

  return {
    tipo_rilevato: "busta_paga",
    datore_lavoro: requireString(root.datore_lavoro, "datore_lavoro"),
    competenza: requireString(root.competenza, "competenza"),
    stipendio_lordo: requireNumber(root.stipendio_lordo, "stipendio_lordo"),
    stipendio_netto: requireNumber(root.stipendio_netto, "stipendio_netto"),
    voci,
    contributi_inps: requireNumber(root.contributi_inps, "contributi_inps"),
    irpef: requireNumber(root.irpef, "irpef"),
    tfr_maturato: requireNullableNumber(root.tfr_maturato, "tfr_maturato"),
    tfr_progressivo: requireNullableNumber(root.tfr_progressivo ?? null, "tfr_progressivo"),
    saldi_assenze: validatePayrollBalances(root.saldi_assenze),
    eventi_periodo: validatePayrollEvents(root.eventi_periodo),
    competenze_totali: requireNullableNumber(root.competenze_totali ?? null, "competenze_totali"),
    trattenute_totali: requireNullableNumber(root.trattenute_totali ?? null, "trattenute_totali"),
    imponibile_previdenziale: requireNullableNumber(root.imponibile_previdenziale ?? null, "imponibile_previdenziale"),
    imponibile_fiscale: requireNullableNumber(root.imponibile_fiscale ?? null, "imponibile_fiscale"),
    irpef_lorda: requireNullableNumber(root.irpef_lorda ?? null, "irpef_lorda"),
    detrazioni: requireNullableNumber(root.detrazioni ?? null, "detrazioni"),
    addizionali: requireNullableNumber(root.addizionali ?? null, "addizionali"),
  };
}
