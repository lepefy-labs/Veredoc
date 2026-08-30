<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Veredoc Repository Agent

This repository is the source of truth for implementation, maintenance, refactoring, CI, backend, frontend and operational work on Veredoc.

## Execution environment

Operate in **cloud-only mode** unless the requester explicitly says otherwise.

Never require the requester to run Git, Node.js, pnpm, npm, build tools, test runners or repository scripts locally. Use connected GitHub capabilities and approved remote CI/deployment systems such as GitHub Actions and Vercel.

## Instruction refresh checkpoints

Treat every newly approved implementation scope as a new agent run.

For every run:
1. fetch and read the current `AGENTS.md` from the requested target branch before planning implementation;
2. re-fetch and re-read `AGENTS.md` immediately before the first remote repository write;
3. re-check the target branch SHA and delivery rules immediately before the final target-branch update;
4. if the target branch moved or the requester materially changes scope, re-read `AGENTS.md` and re-evaluate the delivery plan.

Never assume these instructions remain unchanged from an earlier turn.

## Autonomy contract

Once the requester approves an implementation plan, that approval covers the entire approved non-critical scope. Organize and execute it autonomously through code changes, validation, implementation-introduced fixes, context updates and final remote verification.

Do not stop between ordinary technical sub-steps to ask for repeated confirmation.

### Mandatory re-approval exceptions

Request explicit approval before a newly discovered action involving:
- significant database/schema migrations with meaningful production impact;
- destructive or difficult-to-reverse data migration/backfill;
- payment, checkout, billing, refunds, payouts or other money-moving flows;
- authentication, authorization, secrets, security policy or access-control changes with material impact;
- another clearly critical production change that could materially affect customer data, availability or compliance.

Build failures, lint/type errors, implementation details, low-risk refactors and corrective commits are not reasons to ask again.

## Repository discovery

Before changing code, inspect the current implementation and follow relevant imports/references. Current repository code overrides stale documentation, previous conversations and screenshots.

Do not ask questions that can be answered by inspecting the repository.

When changing Next.js behavior, read the relevant current documentation under `node_modules/next/dist/docs/` before writing code, as required by the Next.js rule above.

## Project context maintenance

`CONTEXT.md` documents the persistent architecture and operating model. Update it in the same delivery unit when implementation changes application architecture/state machine, major routes/modules, permanent business workflow/rules, schema/migrations, billing, auth/access model, background jobs/schedulers, platform configuration, CI/deployment operating model, or documented technical debt.

For isolated cosmetic changes or bug fixes that do not change a persistent documented fact, a context update is not required. Update current-state sections rather than appending session chronology.

## Commit and deployment batching

Treat one approved logical implementation step as one delivery unit.

Default rule:

`INSPECT -> EDIT ALL RELATED FILES -> UPDATE CONTEXT IF REQUIRED -> REVIEW AS A SET -> ONE ATOMIC COMMIT -> ONE TARGET-BRANCH UPDATE -> CI -> DEPLOY`

- Batch all related changes before updating the production target branch.
- Do **not** push after each file, component, sub-step or cosmetic adjustment.
- Do **not** intentionally create intermediate production commits just to checkpoint progress.
- A logical step may touch many files and should normally still produce one final production commit.
- Prefer an atomic Git tree/commit when the connector would otherwise create one commit per file.

### Preview/PR deployment policy

**Do not create a staging PR by default when targeting `main`.** Vercel preview deployments are a finite operational resource and should not be generated merely to run ordinary validation.

Preferred delivery for normal non-critical work targeting `main`:
1. inspect and prepare the full change without remote file-by-file writes to `main`;
2. create one atomic commit directly from the verified current `main` SHA;
3. move `main` once;
4. let the `main` GitHub Actions run validate lint/typecheck/tests/build;
5. verify the single production deployment when observable.

A PR/staging deployment is justified only when:
- the requester explicitly asks for a PR;
- branch protection or repository policy requires it;
- the change is sufficiently risky/large that pre-production remote validation is materially safer than a direct atomic update;
- a failing production CI cannot be diagnosed safely without isolated branch validation.

Do not open a PR solely because it is convenient for CI. If a PR is genuinely required, explain why in the final report.

If post-update CI exposes an implementation-introduced error, fix it autonomously with one complete corrective atomic commit. Avoid opening a PR unless it meets one of the conditions above.

Before updating `main`, compare its current SHA with the run base SHA. If it moved, inspect the change and re-evaluate before writing.

## Validation and fix loop

Before the target update:
1. review the complete intended diff;
2. verify only intended files are included;
3. check for debug code, temporary assets and unrelated changes;
4. confirm `CONTEXT.md` is updated when required;
5. re-fetch `AGENTS.md` and current target SHA;
6. use non-deploying validation where available; do not create a PR merely for validation.

After the target update:
1. independently verify the target branch points to the expected final SHA;
2. inspect GitHub Actions and Vercel when available;
3. verify lint, typecheck, tests and build as applicable;
4. if a check fails because of this work, inspect logs, fix autonomously and repeat;
5. never claim a check or deployment passed without remote evidence.

## Git target

Respect the target requested by the user.
- For a requested PR/branch, work there.
- For `main`, use the atomic batching rules above.
- Never force-push unless explicitly instructed.
- Never overwrite unrelated work.

## Deployment verification

If Vercel is the production path and the matching deployment is observable, completion requires a successful terminal state such as `READY`. Do not treat queued/building states as completion. If deployment access is unavailable, report that limitation rather than inventing a result.

## Final response

Keep completion reporting concise and operational:
- implementation completed;
- `CONTEXT.md` reviewed/updated when required;
- remote validation result;
- deployment result when observable;
- verified target branch;
- final commit SHA;
- only meaningful caveats or genuine blockers.
