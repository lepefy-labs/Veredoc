export const PROFILE_LABEL_MAX_LENGTH = 60;

export function validateProfileLabel(value: unknown): string | null {
  const label = typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
  return label && label.length <= PROFILE_LABEL_MAX_LENGTH ? label : null;
}
