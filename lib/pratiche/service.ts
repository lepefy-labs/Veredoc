import "server-only";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { applies, parseWorkflow, progress, validateAnswer, type Answer } from "./engine";
import { hasVerifiedCoverage } from "./publication";
import { praticheEnabled } from "./feature";
import { plainDetails, plainPreparation, plainTitle, plainWorkflow } from "./plain-language";

export { praticheEnabled };

export class PracticeError extends Error {
  constructor(message: string, public status: number) { super(message); }
}

export async function praticheSchemaReady(): Promise<boolean> {
  try {
    await prisma.procedureDefinition.count();
    return true;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && ["P2021", "P2022"].includes(error.code)) return false;
    throw error;
  }
}

const versionInclude = {
  citations: { include: { source: { include: { revisions: { orderBy: { version: "desc" }, take: 1 } } }, revision: true } },
} satisfies Prisma.ProcedureVersionInclude;

export function isPublishable(version: Prisma.ProcedureVersionGetPayload<{ include: typeof versionInclude }>): boolean {
  if (version.status !== "PUBLISHED" || !version.approvedAt || version.citations.length === 0) return false;
  return hasVerifiedCoverage(version);
}

export async function catalog() {
  const rows = await prisma.procedureDefinition.findMany({
    include: { versions: { include: versionInclude, orderBy: { version: "desc" } } },
    orderBy: { title: "asc" },
  });
  return rows.map((procedure) => {
    const { versions } = procedure;
    const published = procedure.status === "PUBLISHED" ? versions.find(isPublishable) : undefined;
    const details = plainDetails(published?.id ?? versions[0]?.id, procedure);
    const workflow = published ? plainWorkflow(published.id, parseWorkflow(published.definition)) : null;
    return {
      slug: procedure.slug, title: details.title, description: details.description,
      category: procedure.category, audience: details.audience, scope: details.scope,
      authority: details.authority,
      available: Boolean(published),
      versionId: published?.id ?? null,
      workflow,
      preparation: workflow ? plainPreparation(published?.id, workflow) : null,
      sources: published?.citations.map(({ source, revision }) => ({ authority: source.authority, title: source.title, url: source.url, scope: source.scope, verifiedAt: source.verifiedAt, revision: revision.version })) ?? [],
    };
  });
}

export async function startCase(userId: string, slug: string, profileId: string, idempotencyKey?: string) {
  const profile = await prisma.analysisProfile.findFirst({ where: { id: profileId, userId }, select: { id: true } });
  if (!profile) throw new PracticeError("Profilo non valido.", 403);
  const procedure = (await catalog()).find((item) => item.slug === slug);
  if (!procedure?.available || !procedure.versionId) throw new PracticeError("Procedura non disponibile.", 409);
  if (idempotencyKey) {
    const existing = await prisma.userCase.findFirst({ where: { userId, idempotencyKey } });
    if (existing) return existing;
  }
  try {
    return await prisma.userCase.create({
      data: { userId, profileId, procedureVersionId: procedure.versionId, title: procedure.title, status: "IN_PROGRESS", idempotencyKey: idempotencyKey || null,
        events: { create: { type: "CREATED", actorId: userId } } },
    });
  } catch (error) {
    if (idempotencyKey && error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const existing = await prisma.userCase.findFirst({ where: { userId, idempotencyKey } });
      if (existing) return existing;
    }
    throw error;
  }
}

export async function readCase(userId: string, id: string) {
  return prisma.userCase.findFirst({
    where: { id, userId },
    include: { answers: true, steps: true, procedureVersion: { include: { procedure: true, citations: { include: { source: true, revision: true } } } } },
  });
}

export function caseView(record: NonNullable<Awaited<ReturnType<typeof readCase>>>) {
  const workflow = plainWorkflow(record.procedureVersion.id, parseWorkflow(record.procedureVersion.definition));
  const answers = Object.fromEntries(record.answers.map((answer) => [answer.questionId, answer.value])) as Record<string, Answer>;
  const completed = new Set(record.steps.filter((step) => step.status === "DONE").map((step) => step.stepId));
  const state = progress(workflow, answers, completed);
  return {
    id: record.id, title: plainTitle(record.procedureVersion.id, record.title), status: record.status, revision: record.revision,
    profileId: record.profileId, procedure: record.procedureVersion.procedure,
    version: record.procedureVersion.version, answers, completed: [...completed], workflow,
    preparation: plainPreparation(record.procedureVersion.id, workflow),
    progress: { required: state.required, done: state.done, ready: state.ready, blocked: state.blocked, missing: [...state.missingQuestions.map((q) => q.title), ...state.missingSteps.map((s) => s.title)] },
    sources: record.procedureVersion.citations.map(({ source, revision }) => ({ title: source.title, authority: source.authority, url: source.url, verifiedAt: source.verifiedAt, version: revision.version })),
    updatedAt: record.updatedAt,
  };
}

type Mutation =
  | { kind: "answer"; questionId: string; value: unknown }
  | { kind: "step"; stepId: string; done: boolean }
  | { kind: "status"; status: "USER_REPORTED_SUBMITTED" | "COMPLETED" | "CANCELLED" };

export async function updateCase(userId: string, id: string, expectedRevision: number, mutation: Mutation) {
  if (!Number.isSafeInteger(expectedRevision) || expectedRevision < 0) throw new PracticeError("Versione non valida.", 400);
  return prisma.$transaction(async (tx) => {
    const record = await tx.userCase.findFirst({ where: { id, userId }, include: { answers: true, steps: true, procedureVersion: true } });
    if (!record) throw new PracticeError("Pratica non trovata.", 404);
    if (["COMPLETED", "CANCELLED", "USER_REPORTED_SUBMITTED"].includes(record.status) && mutation.kind !== "status") throw new PracticeError("Pratica non modificabile.", 409);
    const workflow = parseWorkflow(record.procedureVersion.definition);
    const answers = Object.fromEntries(record.answers.map((answer) => [answer.questionId, answer.value])) as Record<string, Answer>;
    const completed = new Set(record.steps.filter((step) => step.status === "DONE").map((step) => step.stepId));
    let value: Answer | undefined;
    if (mutation.kind === "answer") {
      const index = workflow.questions.findIndex((question) => question.id === mutation.questionId);
      const question = workflow.questions[index];
      if (!question || !applies(question.when, answers)) throw new PracticeError("Domanda non applicabile.", 400);
      if (workflow.questions.slice(0, index).some((prior) => prior.required && applies(prior.when, answers) && !(prior.id in answers))) throw new PracticeError("Completa prima le domande precedenti.", 409);
      try { value = validateAnswer(question, mutation.value); } catch { throw new PracticeError("Risposta non valida.", 400); }
      answers[question.id] = value;
      for (const later of workflow.questions.slice(index + 1)) if (!applies(later.when, answers)) delete answers[later.id];
    } else if (mutation.kind === "step") {
      const step = workflow.steps.find((item) => item.id === mutation.stepId);
      if (!step || !applies(step.when, answers)) throw new PracticeError("Passaggio non applicabile.", 400);
      if (step.kind === "portal") throw new PracticeError("La presentazione si effettua sul portale ufficiale.", 400);
      const state = progress(workflow, answers, completed);
      if (state.blocked) throw new PracticeError("Percorso non disponibile per questo caso.", 409);
      if (state.missingQuestions.length) throw new PracticeError("Completa prima le domande.", 409);
      if (mutation.done) completed.add(step.id); else completed.delete(step.id);
    } else {
      const ready = progress(workflow, answers, completed).ready;
      if (mutation.status === "USER_REPORTED_SUBMITTED" && (!ready || record.status !== "READY_TO_SUBMIT")) throw new PracticeError("La pratica non è pronta.", 409);
      if (mutation.status === "COMPLETED" && record.status !== "USER_REPORTED_SUBMITTED") throw new PracticeError("La presentazione non è stata dichiarata.", 409);
    }
    const state = progress(workflow, answers, completed);
    const changed = await tx.userCase.updateMany({ where: { id, userId, revision: expectedRevision }, data: { revision: { increment: 1 }, status: mutation.kind === "status" ? mutation.status : state.blocked ? "BLOCKED" : state.ready ? "READY_TO_SUBMIT" : "IN_PROGRESS", completedAt: mutation.kind === "status" && mutation.status === "COMPLETED" ? new Date() : undefined } });
    if (changed.count !== 1) throw new PracticeError("La pratica è stata aggiornata altrove. Ricarica la pagina.", 409);
    if (mutation.kind === "answer") {
      await tx.caseAnswer.upsert({ where: { caseId_questionId: { caseId: id, questionId: mutation.questionId } }, create: { caseId: id, questionId: mutation.questionId, value: value as Prisma.InputJsonValue, revision: expectedRevision + 1 }, update: { value: value as Prisma.InputJsonValue, revision: expectedRevision + 1 } });
      const validQuestions = new Set(Object.keys(answers));
      await tx.caseAnswer.deleteMany({ where: { caseId: id, questionId: { notIn: [...validQuestions] } } });
      const applicableSteps = new Set(workflow.steps.filter((step) => applies(step.when, answers)).map((step) => step.id));
      await tx.caseStep.deleteMany({ where: { caseId: id, stepId: { notIn: [...applicableSteps] } } });
    }
    if (mutation.kind === "step") await tx.caseStep.upsert({ where: { caseId_stepId: { caseId: id, stepId: mutation.stepId } }, create: { caseId: id, stepId: mutation.stepId, status: mutation.done ? "DONE" : "PENDING", completedAt: mutation.done ? new Date() : null }, update: { status: mutation.done ? "DONE" : "PENDING", completedAt: mutation.done ? new Date() : null } });
    await tx.caseEvent.create({ data: { caseId: id, actorId: userId, type: mutation.kind === "status" ? mutation.status : mutation.kind === "answer" ? "ANSWERED" : "STEP_UPDATED", metadata: mutation.kind === "answer" ? { questionId: mutation.questionId } : mutation.kind === "step" ? { stepId: mutation.stepId } : undefined } });
    return { revision: expectedRevision + 1 };
  });
}
