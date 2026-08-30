<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Veredoc Repository Agent

This repository is the source of truth.

Use these instructions for implementation, maintenance, refactoring, CI, backend, frontend and operational work on Veredoc.

## Execution environment

Operate in **cloud-only mode** unless the requester explicitly says otherwise.

Never require the requester to run Git, Node.js, pnpm, npm, build tools, test runners or repository scripts locally.
Use connected GitHub capabilities and approved remote CI/deployment systems such as GitHub Actions and Vercel.

## Instruction refresh checkpoints

Treat every newly approved implementation scope as a new agent run.

For every run:

1. fetch and read the current `AGENTS.md` from the requested target branch before planning implementation;
2. re-fetch and re-read `AGENTS.md` immediately before the first remote repository write;
3. re-check the target branch SHA and the commit/deployment batching rules immediately before the final target-branch update;
4. if the target branch moved or the requester materially changes scope, re-read `AGENTS.md` and re-evaluate the delivery plan before writing.

Never assume these instructions remain unchanged from an earlier conversation turn.

## Autonomy contract

Once the requester approves an implementation plan, that approval covers the entire approved scope.

From that point onward, organize and execute all non-critical implementation work autonomously until the scope is complete. This includes editing multiple files, running remote validation, inspecting CI failures, fixing implementation-introduced lint/type/test/build issues, updating project context when needed, and verifying the final remote state.

Do not stop between ordinary technical sub-steps to ask `Proceed?`, `Continue?`, or equivalent.

### Mandatory re-approval exceptions

Request explicit approval before performing a newly discovered action involving:

- significant database/schema migrations with meaningful production impact;
- destructive or difficult-to-reverse data migration/backfill;
- payment, checkout, billing, refunds, payouts, Stripe/payment-provider logic or other money-moving flows;
- authentication, authorization, secrets, security policy or access-control changes with material impact;
- another clearly critical production change that could materially affect customer data, availability or compliance.

Build failures, lint/type errors, implementation details, low-risk refactors and corrective commits are not reasons to ask for approval again.

## Repository discovery

Before changing code, inspect the current implementation and follow relevant imports/references. The current repository overrides stale documentation, previous conversations and old screenshots.

Do not ask questions that can be answered by inspecting the repository.

When changing Next.js behavior, read the relevant current documentation under `node_modules/next/dist/docs/` before writing code, as required by the Next.js agent rule above.

## Project context maintenance

`CONTEXT.md` documents the current persistent architecture and operating model.

Update it in the same delivery unit when implementation changes one or more of:

- application architecture or state machine;
- major routes/modules or their responsibilities;
- permanent business workflow/rules;
- database schema or significant migrations;
- billing/payment architecture;
- authentication/authorization model;
- background jobs, schedulers, queues or operational recovery;
- tenant/platform configuration;
- CI/deployment operating model;
- known technical debt explicitly documented in `CONTEXT.md`.

For an isolated cosmetic change or bug fix that does not change a persistent documented fact, a context update is not required. Still evaluate it consciously before completion.

Update the current-state section rather than appending session chronology. Remove or correct stale statements.

## Commit and deployment batching

Treat one approved logical implementation step as one delivery unit.

Default rule:

`EDIT ALL RELATED FILES -> UPDATE CONTEXT IF REQUIRED -> VALIDATE AS A SET -> ONE FINAL COMMIT -> ONE TARGET-BRANCH UPDATE -> VERIFY CI/DEPLOYMENT`

- Batch all related file changes before updating the production target branch.
- Do **not** push after each file, component, sub-step or cosmetic adjustment.
- Do **not** intentionally create intermediate production commits just to checkpoint progress.
- A logical step may touch many files and should normally still produce one final production commit.
- When the GitHub connector would create one commit per file write, do not perform repeated per-file writes on `main`. Prefer an atomic Git tree/commit, a staging branch/PR, or another mechanism that yields one coherent final target-branch commit.
- A staging branch may contain corrective commits while remote CI is being used to validate the complete change. When targeting `main`, prefer squash merge so `main` receives one coherent implementation commit.
- If validation after the final production update exposes an implementation-introduced error, create one complete corrective commit and verify the new final SHA.

Before updating the production target branch, compare its current SHA with the run base SHA. If it moved, inspect the change and re-evaluate before writing.

## Validation and fix loop

Validation is remote/cloud-only.

Before the final target-branch update:

1. review the complete intended diff;
2. verify only intended files are included;
3. check for debug code, temporary assets and unrelated changes;
4. confirm `CONTEXT.md` is updated when required;
5. re-fetch `AGENTS.md` and confirm the delivery strategy still complies with the current batching rules;
6. use available staging/PR CI or other remote checks when practical.

After the final target-branch update:

1. independently verify the target branch points to the expected final SHA;
2. inspect GitHub Actions and Vercel when available;
3. verify lint, typecheck, tests and build as applicable;
4. if a check fails because of this work, inspect logs, fix it autonomously, and repeat validation;
5. do not claim a check passed without remote evidence.

## Git target

Respect the target requested by the user.

- For a requested PR/branch, work and push there.
- For `main`, deliver the approved logical scope to `main` using the batching rules above.
- Never force-push unless explicitly instructed.
- Never overwrite unrelated work.

## Deployment verification

If Vercel is the production path and the matching deployment is observable, completion requires verifying the deployment for the final commit reaches a successful terminal state such as `READY`.

Do not treat `QUEUED`, `INITIALIZING`, `BUILDING`, or equivalent as completion. If deployment access is unavailable, report that limitation rather than inventing a result.

## Final response

Keep completion reporting concise and operational:

- implementation completed;
- `CONTEXT.md` reviewed/updated when required;
- remote validation result;
- deployment result when observable;
- verified target branch;
- final commit SHA;
- only meaningful caveats or genuine blockers.
