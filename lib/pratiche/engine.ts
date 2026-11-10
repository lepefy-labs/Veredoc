export type Answer = string | string[] | boolean;
export type Condition = { questionId: string; equals: string | boolean };
export type Question = {
  id: string;
  title: string;
  type: "single" | "multiple" | "boolean";
  options?: { value: string; label: string }[];
  required: boolean;
  blockedValues?: (string | boolean)[];
  when?: Condition;
};
export type Step = {
  id: string;
  title: string;
  description: string;
  kind: "task" | "document" | "portal";
  required: boolean;
  when?: Condition;
  url?: string;
};
export type Workflow = { questions: Question[]; steps: Step[] };

export function parseWorkflow(value: unknown): Workflow {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Procedura non valida");
  const data = value as Record<string, unknown>;
  if (!Array.isArray(data.questions) || !Array.isArray(data.steps)) throw new Error("Procedura non valida");
  const questions = data.questions as Question[];
  const steps = data.steps as Step[];
  if (!steps.some((step) => step?.kind === "portal") || !steps.some((step) => step?.kind !== "portal" && step?.required)) throw new Error("Passaggi insufficienti");
  const ids = new Set<string>();
  for (const item of [...questions, ...steps]) {
    if (!item || typeof item.id !== "string" || !/^[a-z][a-z0-9_]{1,63}$/.test(item.id) || ids.has(item.id)) throw new Error("Identificatore non valido");
    ids.add(item.id);
    if (typeof item.title !== "string" || !item.title.trim()) throw new Error("Titolo mancante");
  }
  const questionIds = new Set(questions.map((q) => q.id));
  for (const question of questions) {
    if (!["single", "multiple", "boolean"].includes(question.type) || typeof question.required !== "boolean") throw new Error("Domanda non valida");
    if (question.type !== "boolean" && (!Array.isArray(question.options) || question.options.length === 0 || question.options.some((o) => typeof o.value !== "string" || typeof o.label !== "string"))) throw new Error("Opzioni non valide");
    if (question.options && new Set(question.options.map((option) => option.value)).size !== question.options.length) throw new Error("Opzioni duplicate");
    if (question.blockedValues && (!Array.isArray(question.blockedValues) || question.blockedValues.some((value) => question.type === "boolean" ? typeof value !== "boolean" : typeof value !== "string" || !question.options?.some((option) => option.value === value)))) throw new Error("Blocco non valido");
  }
  for (const step of steps) {
    if (!["task", "document", "portal"].includes(step.kind) || typeof step.required !== "boolean" || typeof step.description !== "string") throw new Error("Passaggio non valido");
    if (step.kind === "portal" && step.required) throw new Error("Il portale non è una condizione di preparazione");
    if (step.kind === "portal" && (!step.url || !isOfficialUrl(step.url))) throw new Error("Portale non valido");
  }
  for (const item of [...questions, ...steps]) {
    if (item.when && (!questionIds.has(item.when.questionId) || !["string", "boolean"].includes(typeof item.when.equals))) throw new Error("Condizione non valida");
  }
  for (let index = 0; index < questions.length; index++) {
    if (questions[index].when && questions.findIndex((question) => question.id === questions[index].when?.questionId) >= index) throw new Error("Le domande dipendono solo da risposte precedenti");
  }
  return { questions, steps };
}

export function isOfficialUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" || parsed.username || parsed.password) return false;
    const host = parsed.hostname.toLowerCase();
    return host === "anagrafenazionale.interno.it" || host.endsWith(".anagrafenazionale.interno.it") || host === "sc.anpr.interno.it" || host === "interno.gov.it" || host.endsWith(".interno.gov.it") || host === "inps.it" || host.endsWith(".inps.it") || host === "normattiva.it" || host.endsWith(".normattiva.it") || host === "agenziaentrate.gov.it" || host.endsWith(".agenziaentrate.gov.it");
  } catch { return false; }
}

export function applies(when: Condition | undefined, answers: Record<string, Answer>): boolean {
  if (!when) return true;
  const actual = answers[when.questionId];
  return Array.isArray(actual) ? actual.includes(String(when.equals)) : actual === when.equals;
}

export function validateAnswer(question: Question, value: unknown): Answer {
  if (question.type === "boolean") {
    if (typeof value !== "boolean") throw new Error("Risposta non valida");
    return value;
  }
  const allowed = new Set(question.options?.map((option) => option.value));
  if (question.type === "single") {
    if (typeof value !== "string" || !allowed.has(value)) throw new Error("Risposta non valida");
    return value;
  }
  if (!Array.isArray(value) || value.some((entry) => typeof entry !== "string" || !allowed.has(entry)) || new Set(value).size !== value.length || (question.required && value.length === 0)) throw new Error("Risposta non valida");
  return value as string[];
}

export function progress(workflow: Workflow, answers: Record<string, Answer>, completed: Set<string>) {
  const questions = workflow.questions.filter((question) => applies(question.when, answers));
  const steps = workflow.steps.filter((step) => applies(step.when, answers));
  const missingQuestions = questions.filter((question) => question.required && !(question.id in answers));
  const missingSteps = steps.filter((step) => step.required && !completed.has(step.id));
  const blocked = questions.some((question) => question.blockedValues?.some((value) => {
    const answer = answers[question.id];
    return Array.isArray(answer) ? answer.includes(String(value)) : answer === value;
  }));
  const required = questions.filter((question) => question.required).length + steps.filter((step) => step.required).length;
  return { questions, steps, missingQuestions, missingSteps, required, done: required - missingQuestions.length - missingSteps.length, blocked, ready: !blocked && missingQuestions.length === 0 && missingSteps.length === 0 };
}
