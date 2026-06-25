import { PATTERNS } from "./patterns";
import { AnonymizationResult, AnonymizationOptions, DetectedEntity, EntityType } from "./types";

export function anonymize(text: string, options: AnonymizationOptions = {}): AnonymizationResult {
  const typesToProcess = options.types?.length
    ? options.types
    : Object.keys(PATTERNS) as EntityType[];

  const entities: DetectedEntity[] = [];
  const counters: Partial<Record<EntityType, number>> = {};

  for (const type of typesToProcess) {
    const regex = new RegExp(PATTERNS[type].source, PATTERNS[type].flags);
    let match;
    while ((match = regex.exec(text)) !== null) {
      counters[type] = (counters[type] ?? 0) + 1;
      const placeholder = `[${type}_${counters[type]}]`;
      // For capture-group patterns (NOME, NUMERO_CONTO), use group 1 if present
      const original = match[1] ?? match[0];
      const startIndex = match[1] ? match.index + match[0].indexOf(match[1]) : match.index;
      const endIndex = startIndex + original.length;
      entities.push({
        type,
        original,
        placeholder,
        startIndex,
        endIndex,
      });
    }
  }

  // Sort descending by position to avoid index shifting during replacement
  entities.sort((a, b) => b.startIndex - a.startIndex);

  const deduped = deduplicateEntities(entities);

  let anonymized = text;
  const map: Record<string, string> = {};

  for (const entity of deduped) {
    anonymized =
      anonymized.slice(0, entity.startIndex) +
      entity.placeholder +
      anonymized.slice(entity.endIndex);
    map[entity.placeholder] = entity.original;
  }

  return { anonymized, map, entities: deduped };
}

export function deanonymize(text: string, map: Record<string, string>): string {
  let result = text;
  for (const [placeholder, original] of Object.entries(map)) {
    result = result.replaceAll(placeholder, original);
  }
  return result;
}

function deduplicateEntities(entities: DetectedEntity[]): DetectedEntity[] {
  const result: DetectedEntity[] = [];
  for (const entity of entities) {
    const overlaps = result.some(
      (e) => entity.startIndex < e.endIndex && entity.endIndex > e.startIndex
    );
    if (!overlaps) result.push(entity);
  }
  return result;
}
