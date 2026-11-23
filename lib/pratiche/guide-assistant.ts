import type { PracticalGuide } from "./guide-content.ts";

export const assistantTopics = {
  documenti: "Cosa devo preparare?",
  passaggi: "Quali passaggi seguire?",
  presentazione: "Come accedo al servizio?",
} as const;

export type AssistantTopic = keyof typeof assistantTopics;
export type AssistantInstruction = { title: string; detail: string };

export function isAssistantTopic(value: unknown): value is AssistantTopic {
  return typeof value === "string" && Object.hasOwn(assistantTopics, value);
}

export function relevantInstructions(guide: PracticalGuide, topic: AssistantTopic): AssistantInstruction[] {
  if (topic === "documenti") return guide.documents;
  if (topic === "passaggi") return guide.steps;
  return [{ title: guide.link.label, detail: guide.destination }];
}

export function applyInstructionSelection(instructions: readonly AssistantInstruction[], raw: string) {
  try {
    const selection: unknown = JSON.parse(raw);
    if (!Array.isArray(selection) || selection.length === 0 || selection.length > 3) return null;
    const indices = new Set<number>();
    for (const index of selection) {
      if (!Number.isSafeInteger(index) || index < 0 || index >= instructions.length || indices.has(index)) return null;
      indices.add(index);
    }
    return [...indices].map((index) => instructions[index]);
  } catch {
    return null;
  }
}
