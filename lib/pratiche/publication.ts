import { requestsPublicGuide } from "./workflow-guide.ts";
import { isOfficialUrl, parseWorkflow } from "./engine.ts";

type CitedVersion = {
  definition: unknown;
  citations: {
    sourceId: string;
    revisionId: string;
    instructionIds: string[];
    source: { status: string; verifiedAt: Date | null; url: string; revisions: { id: string }[] };
    revision: { status: string; sourceId: string };
  }[];
};

export function reviewCoverage(version: CitedVersion) {
  let workflow;
  try {
    workflow = parseWorkflow(version.definition);
  } catch {
    return { validWorkflow: false, invalidCitations: [], missingInstructions: [], canPublish: false };
  }
  const validPublicGuide = !requestsPublicGuide(version.definition) || workflow.steps.some((step) => step.kind === "portal" && !step.when);
  const covered = new Set<string>();
  const invalidCitations: string[] = [];
  for (const citation of version.citations) {
    const { source, revision } = citation;
    if (source.status !== "VERIFIED" || revision.status !== "VERIFIED" || !source.verifiedAt ||
        revision.sourceId !== citation.sourceId || source.revisions[0]?.id !== citation.revisionId || !isOfficialUrl(source.url)) {
      invalidCitations.push(source.url);
      continue;
    }
    for (const id of citation.instructionIds) covered.add(id);
  }
  const missingInstructions = [...workflow.questions, ...workflow.steps]
    .filter(({ id }) => !covered.has(id))
    .map(({ id, title }) => ({ id, title }));
  return {
    validWorkflow: validPublicGuide,
    invalidCitations,
    missingInstructions,
    canPublish: validPublicGuide && invalidCitations.length === 0 && missingInstructions.length === 0,
  };
}

export function hasVerifiedCoverage(version: CitedVersion): boolean {
  return reviewCoverage(version).canPublish;
}
