import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { PGlite } from "@electric-sql/pglite";
import {
  LEGAL_DOCUMENTS_VERSION,
  PASSWORD_PROBLEM_MESSAGES,
  isValidEmail,
  normalizeEmail,
  passwordProblem,
} from "../lib/account/credentials.ts";
import {
  RATE_LIMITS,
  clientIpFrom,
  consumeRateLimitSql,
  consumeRateLimits,
  isMissingTableError,
  purgeRateLimitsSql,
  rateLimitKey,
  type QueryCount,
} from "../lib/security/rate-limit.ts";
import { validateProfileLabel } from "../lib/profiles/validation.ts";
import { safeCallbackPath, buildLoginRedirectPath } from "../lib/security/redirect.ts";

const MIGRATION = readFileSync(new URL("../supabase/migrations/004_account_security.sql", import.meta.url), "utf8");
const openDatabases: PGlite[] = [];

async function createDb() {
  const db = new PGlite();
  openDatabases.push(db);
  await db.exec(`CREATE TABLE "User" ("id" TEXT PRIMARY KEY, "email" TEXT NOT NULL UNIQUE, "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now())`);
  await db.exec(MIGRATION);
  await db.exec(MIGRATION); // idempotente
  return db;
}

test.after(async () => {
  await Promise.all(openDatabases.map((db) => db.close()));
});

function pgQuery(db: PGlite): QueryCount {
  return async (query) => (await db.query<{ count: number }>(query.text, query.values as unknown[])).rows;
}

test("credenziali: email normalizzate in minuscolo e validate", () => {
  assert.equal(normalizeEmail("  Mario.Rossi@Example.IT "), "mario.rossi@example.it");
  assert.equal(normalizeEmail(undefined), "");
  assert.equal(normalizeEmail(42), "");
  assert.equal(isValidEmail("mario_rossi+tag@example.it"), true);
  for (const value of ["", "mario", "mario@", "mario@example", "a b@example.it"]) assert.equal(isValidEmail(value), false, value);
});

test("credenziali: regole password verificate lato server", () => {
  assert.equal(passwordProblem(undefined), "missing");
  assert.equal(passwordProblem(""), "missing");
  assert.equal(passwordProblem("1234567"), "too_short");
  assert.equal(passwordProblem("12345678"), null);
  assert.equal(passwordProblem("è".repeat(37)), "too_long"); // 74 byte UTF-8
  assert.equal(passwordProblem("a".repeat(72)), null);
  assert.match(PASSWORD_PROBLEM_MESSAGES.too_short, /8 caratteri/);
  assert.match(LEGAL_DOCUMENTS_VERSION, /^\d{4}-\d{2}$/);
});

test("rate limit: finestra fissa atomica su Postgres", async () => {
  const db = await createDb();
  const rule = { name: "test", limit: 3, windowSeconds: 900 };
  const query = pgQuery(db);

  const results = [];
  for (let attempt = 0; attempt < 5; attempt++) {
    results.push((await consumeRateLimits(query, [{ rule, subject: "mario@example.it" }])).allowed);
  }
  assert.deepEqual(results, [true, true, true, false, false]);

  // Soggetti diversi hanno contatori separati.
  assert.equal((await consumeRateLimits(query, [{ rule, subject: "altro@example.it" }])).allowed, true);

  // Finestra scaduta: il contatore riparte.
  await db.query(`UPDATE "RateLimitBucket" SET "windowStart" = now() - interval '16 minutes'`);
  assert.equal((await consumeRateLimits(query, [{ rule, subject: "mario@example.it" }])).allowed, true);
  const rows = await db.query<{ count: number }>(`SELECT count FROM "RateLimitBucket" WHERE key = $1`, [rateLimitKey(rule, "mario@example.it")]);
  assert.equal(rows.rows[0].count, 1);
});

test("rate limit: nessun dato personale in chiaro e pulizia dei contatori vecchi", async () => {
  const db = await createDb();
  await consumeRateLimits(pgQuery(db), [
    { rule: RATE_LIMITS.loginEmail, subject: "mario@example.it" },
    { rule: RATE_LIMITS.loginIp, subject: "203.0.113.7" },
  ]);
  const keys = (await db.query<{ key: string }>(`SELECT key FROM "RateLimitBucket"`)).rows.map((row) => row.key);
  assert.equal(keys.length, 2);
  for (const key of keys) {
    assert.match(key, /^[0-9a-f]{64}$/);
    assert.ok(!key.includes("mario") && !key.includes("203.0"));
  }

  await db.query(`UPDATE "RateLimitBucket" SET "windowStart" = now() - interval '2 days'`);
  const purge = purgeRateLimitsSql();
  const deleted = await db.query(purge.text, purge.values as unknown[]);
  assert.equal(deleted.affectedRows, 2);
});

test("rate limit: fail-open se la tabella non esiste ancora", async () => {
  const db = new PGlite();
  openDatabases.push(db);
  const errors: boolean[] = [];

  const result = await consumeRateLimits(pgQuery(db), [{ rule: RATE_LIMITS.loginEmail, subject: "mario@example.it" }], (_error, missing) => errors.push(missing));

  assert.deepEqual(result, { allowed: true, enforced: false });
  assert.deepEqual(errors, [true]);
});

test("rate limit: soggetto assente ignorato, una regola superata blocca", async () => {
  let calls = 0;
  const query: QueryCount = async () => {
    calls++;
    return [{ count: calls === 2 ? 51 : 1 }];
  };
  const result = await consumeRateLimits(query, [
    { rule: RATE_LIMITS.loginEmail, subject: "mario@example.it" },
    { rule: RATE_LIMITS.loginIp, subject: "203.0.113.7" },
    { rule: RATE_LIMITS.loginIp, subject: null },
  ]);
  assert.equal(calls, 2);
  assert.deepEqual(result, { allowed: false, enforced: true });
  assert.ok(consumeRateLimitSql("k", RATE_LIMITS.loginEmail).text.includes("ON CONFLICT"));
});

test("rate limit: IP client e riconoscimento tabella mancante", () => {
  const headers = (values: Record<string, string>) => ({ get: (name: string) => values[name] ?? null });
  assert.equal(clientIpFrom(headers({ "x-forwarded-for": "203.0.113.7, 10.0.0.1" })), "203.0.113.7");
  assert.equal(clientIpFrom(headers({ "x-real-ip": "198.51.100.2" })), "198.51.100.2");
  assert.equal(clientIpFrom(headers({})), null);
  assert.equal(clientIpFrom(undefined), null);
  assert.equal(isMissingTableError(new Error('relation "RateLimitBucket" does not exist')), true);
  assert.equal(isMissingTableError(new Error("connection refused")), false);
});

test("consenso: tabella UserConsent con cascade sull'utente", async () => {
  const db = await createDb();
  await db.query(`INSERT INTO "User" (id, email) VALUES ('u1', 'mario@example.it')`);
  await db.query(`INSERT INTO "UserConsent" (id, "userId", kind, version) VALUES ('c1', 'u1', 'TERMS_PRIVACY', $1)`, [LEGAL_DOCUMENTS_VERSION]);
  const [consent] = (await db.query<{ acceptedAt: Date; version: string }>(`SELECT "acceptedAt", version FROM "UserConsent"`)).rows;
  assert.ok(consent.acceptedAt instanceof Date);
  assert.equal(consent.version, LEGAL_DOCUMENTS_VERSION);

  await db.query(`DELETE FROM "User" WHERE id = 'u1'`);
  assert.equal((await db.query(`SELECT 1 FROM "UserConsent"`)).rows.length, 0);
});

test("ricerca email: lower() esatto, nessun jolly con underscore", async () => {
  const db = await createDb();
  await db.query(`INSERT INTO "User" (id, email) VALUES ('u1', 'Mario_Rossi@Example.it'), ('u2', 'marioxrossi@example.it')`);
  const find = async (email: string) => (await db.query<{ id: string }>(
    `SELECT id FROM "User" WHERE lower(email) = $1 ORDER BY "createdAt" LIMIT 1`, [normalizeEmail(email)]
  )).rows[0]?.id ?? null;

  assert.equal(await find("mario_rossi@example.it"), "u1");
  assert.equal(await find("MARIOXROSSI@example.it"), "u2");
  assert.equal(await find("mario%rossi@example.it"), null);
});

test("profili: nome validato e normalizzato", () => {
  assert.equal(validateProfileLabel("  Casa   Milano "), "Casa Milano");
  assert.equal(validateProfileLabel(""), null);
  assert.equal(validateProfileLabel("x".repeat(61)), null);
  assert.equal(validateProfileLabel(12), null);
});

test("account: rotta protetta con ritorno dopo il login", () => {
  assert.equal(safeCallbackPath("/account"), "/account");
  assert.equal(buildLoginRedirectPath("/account", ""), "/login?callbackUrl=%2Faccount");
});
