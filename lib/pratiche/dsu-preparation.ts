import { applies, progress, type Answer, type Workflow } from "./engine.ts";

export const DSU_PROCEDURE_SLUG = "preparazione-dsu-isee";

export function applicableDsuDocumentSteps(workflow: Workflow, answers: Record<string, Answer>) {
  return workflow.steps.filter((step) => step.kind === "document" && applies(step.when, answers)).map(({ id }) => id);
}

export function dsuPreparation(workflow: Workflow, answers: Record<string, Answer>, completed: readonly string[], linkedSteps: readonly string[] | null) {
  const done = new Set(completed);
  const state = progress(workflow, answers, done);
  const linked = linkedSteps === null ? null : new Set(linkedSteps);

  if (state.blocked || state.missingQuestions.length > 0) {
    return { questions: state.blocked ? [] : state.missingQuestions, tasks: [], documents: [] };
  }

  return {
    questions: [],
    tasks: state.missingSteps.filter(({ kind }) => kind === "task"),
    documents: state.steps.filter(({ kind }) => kind === "document").map((step) => ({
      id: step.id,
      title: step.title,
      required: step.required,
      done: done.has(step.id),
      linked: linked?.has(step.id) ?? null,
    })),
  };
}
