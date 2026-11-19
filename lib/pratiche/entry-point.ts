export type PracticeEntryPoint = "public_guide" | "caf_pilot";

export function practiceEntryPoint(value: unknown, slug: string): PracticeEntryPoint | undefined {
  if (value === "public_guide") return value;
  if (value === "caf_pilot" && slug === "preparazione-dsu-isee") return value;
  return undefined;
}
