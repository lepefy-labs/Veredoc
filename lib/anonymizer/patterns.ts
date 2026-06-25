import { EntityType } from "./types";

export const PATTERNS: Record<EntityType, RegExp> = {
  CODICE_FISCALE: /[A-Z]{6}\d{2}[A-Z]\d{2}[A-Z]\d{3}[A-Z]/gi,
  IBAN: /\bIT\d{2}[\s]?[A-Z0-9]{4}[\s]?[A-Z0-9]{4}[\s]?[A-Z0-9]{4}[\s]?[A-Z0-9]{4}[\s]?[A-Z0-9]{4}[\s]?[A-Z0-9]{3}\b/gi,
  PARTITA_IVA: /\b\d{11}\b/g,
  POD: /\bIT\d{3}E\d{8,10}\b/gi,
  PDR: /\b\d{14}\b/g,
  TELEFONO: /(?:\+39[\s\-]?)?(?:0\d{1,3}[\s\-]?\d{5,8}|3\d{2}[\s\-]?\d{6,7})/g,
  EMAIL: /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g,
  NUMERO_CONTO: /(?:c\/c|conto|n\.)\s*:?\s*(\d{10,12})/gi,
  NOME: /(?:(?:Intestatario|Cliente|Sig(?:\.ra?)?|Nome\s+e\s+Cognome|Titolare)\s*:?\s*)([A-ZÀÈÉÌÒÙ][a-zàèéìòù]+(?:\s+[A-ZÀÈÉÌÒÙ][a-zàèéìòù]+){1,2})/g,
  INDIRIZZO: /(?:Via|Viale|Corso|Piazza|Largo|V\.le|P\.za)\s+[A-Za-zÀ-ÿ\s']+,?\s*\d+(?:\/[A-Za-z])?/gi,
};
