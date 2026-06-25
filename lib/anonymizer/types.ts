export type EntityType =
  | "CODICE_FISCALE"
  | "IBAN"
  | "PARTITA_IVA"
  | "RAGIONE_SOCIALE"
  | "NOME"
  | "INDIRIZZO"
  | "POD"
  | "PDR"
  | "TELEFONO"
  | "NUMERO_CONTO"
  | "EMAIL";

export interface DetectedEntity {
  type: EntityType;
  original: string;
  placeholder: string;
  startIndex: number;
  endIndex: number;
}

export interface AnonymizationResult {
  anonymized: string;
  map: Record<string, string>;
  entities: DetectedEntity[];
}

export interface AnonymizationOptions {
  types?: EntityType[];
  preserveStructure?: boolean;
}
