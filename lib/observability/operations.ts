export type OperationalLevel = "info" | "warn" | "error";
export type OperationalField = string | number | boolean | null | undefined;
export type OperationalFields = Record<string, OperationalField>;

export function elapsedMs(startedAtMs: number, endedAtMs = Date.now()): number {
  return Math.max(0, endedAtMs - startedAtMs);
}

export function toSafeErrorMessage(error: unknown, maxLength = 500): string {
  const message = error instanceof Error ? error.message : typeof error === "string" ? error : "Errore sconosciuto";
  return message.slice(0, maxLength);
}

export function createOperationalEvent(
  event: string,
  fields: OperationalFields = {},
  timestamp = new Date()
): Record<string, string | number | boolean | null> {
  const compactFields = Object.fromEntries(
    Object.entries(fields).filter((entry): entry is [string, string | number | boolean | null] => entry[1] !== undefined)
  );

  return {
    service: "veredoc",
    event,
    timestamp: timestamp.toISOString(),
    ...compactFields,
  };
}

export function logOperationalEvent(
  event: string,
  fields: OperationalFields = {},
  level: OperationalLevel = "info"
): void {
  const payload = JSON.stringify(createOperationalEvent(event, fields));
  if (level === "error") console.error(payload);
  else if (level === "warn") console.warn(payload);
  else console.info(payload);
}
