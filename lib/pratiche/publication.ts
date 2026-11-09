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

export function hasVerifiedCoverage(version: CitedVersion): boolean {
  if (version.citations.length === 0) return false;
  let workflow;
  try { workflow = parseWorkflow(version.definition); } catch { return false; }
  const covered = new Set<string>();
  for (const citation of version.citations) {
    if (citation.source.status !== "VERIFIED" || citation.revision.status !== "VERIFIED" || !citation.source.verifiedAt || citation.revision.sourceId !== citation.sourceId || citation.source.revisions[0]?.id !== citation.revisionId || !isOfficialUrl(citation.source.url)) return false;
    for (const id of citation.instructionIds) covered.add(id);
  }
  return [...workflow.questions, ...workflow.steps].every((item) => covered.has(item.id));
}
