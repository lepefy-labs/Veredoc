import { EntityType } from "./types";

export const PATTERNS: Record<EntityType, RegExp> = {
  // CF ha struttura interna univoca (6L+2N+1L+2N+1L+3N+1L = 16 char), no word boundary necessari
  CODICE_FISCALE: /[A-Z]{6}\d{2}[A-Z]\d{2}[A-Z]\d{3}[A-Z]/gi,
  IBAN: /\bIT\d{2}[\s]?[A-Z0-9]{4}[\s]?[A-Z0-9]{4}[\s]?[A-Z0-9]{4}[\s]?[A-Z0-9]{4}[\s]?[A-Z0-9]{4}[\s]?[A-Z0-9]{3}\b/gi,
  PARTITA_IVA: /\b\d{11}\b/g,
  // Cattura ragioni sociali con suffisso societario italiano (con o senza punti)
  RAGIONE_SOCIALE: /(?:[A-Z][A-Z\s.\-']{1,50}?\s)?(?:S\.?R\.?L\.?|S\.?P\.?A\.?|S\.?N\.?C\.?|S\.?A\.?S\.?|S\.?C\.?A\.?R\.?L\.?|S\.?C\.?S\.?|S\.?C\.?P\.?A\.?|SRL|SPA|SNC|SAS|SCARL)\b/gi,
  POD: /\bIT\d{3}E\d{8,10}\b/gi,
  PDR: /\b\d{14}\b/g,
  // Solo formati italiani riconoscibili: +39/0039, fissi 0xx, cellulari 3xx
  TELEFONO: /(?:(?:\+39|0039)[\s\-.]?)?(?:0\d{1,4}[\s\-.]?\d{4,8}|3\d{2}[\s\-.]?\d{6,8})/g,
  EMAIL: /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g,
  NUMERO_CONTO: /(?:c\/c|conto|n\.)\s*:?\s*(\d{10,12})/gi,
  // Keyword estese per buste paga: DIPENDENTE, NOMINATIVO, ecc. — cattura 2-3 token dopo la keyword
  NOME: /(?:(?:Intestatario|Cliente|Sig\.?ra?|Dott\.?|Ing\.?|Nome\s+e\s+Cognome|Cognome\s+e\s+Nome|Titolare|NOME|COGNOME|DIPENDENTE|LAVORATORE|NOMINATIVO|COLLABORATORE|RUOLO)\s*:?\s*)([A-ZÀ-Ü][a-zA-ZÀ-ü\-']+(?:\s[A-ZÀ-Ü][a-zA-ZÀ-ü\-']+){1,3})/gi,
  INDIRIZZO: /(?:Via|Viale|Corso|Piazza|Largo|V\.le|P\.za)\s+[A-Za-zÀ-ÿ\s']+,?\s*\d+(?:\/[A-Za-z])?/gi,
};
