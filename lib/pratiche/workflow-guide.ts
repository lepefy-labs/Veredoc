import type { Workflow } from "./engine.ts";
import type { PracticalGuide } from "./guide-content.ts";

type Source = { title: string; url: string };

export function requestsPublicGuide(definition: unknown) {
  return typeof definition === "object" && definition !== null && "publicGuide" in definition && definition.publicGuide === true;
}

export function workflowGuide(workflow: Workflow, sources: readonly Source[]): PracticalGuide | undefined {
  const portal = workflow.steps.find((step) => step.kind === "portal" && !step.when);
  const source = sources[0];
  if (!portal?.url || !source) return undefined;

  const entry = (step: Workflow["steps"][number]) => ({
    title: step.title,
    detail: step.when ? `Quando si applica al tuo caso. ${step.description}` : step.description,
  });
  return {
    destination: portal.description,
    link: { label: portal.title, href: portal.url },
    alternative: "Consulta le istruzioni dell’ente per i casi particolari.",
    documents: workflow.steps.filter((step) => step.kind === "document").map(entry),
    steps: workflow.steps.filter((step) => step.kind !== "document" && step.id !== portal.id).map(entry),
    stepsHeading: "Passaggi da seguire",
    source: { label: source.title, href: source.url },
    references: sources.slice(1).map(({ title, url }) => ({ label: title, href: url })),
  };
}
