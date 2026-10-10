import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { PGlite } from "@electric-sql/pglite";
import type { Prisma } from "@prisma/client";
import {
  applyEmailChangeSql,
  bumpSessionVersionSql,
  consumeEmailTokenSql,
  createEmailTokenSql,
  ensureAccountStateSql,
  markEmailVerifiedSql,
  revokeEmailTokensSql,
  sessionStateSql,
  type SessionStateRow,
} from "../lib/account/lifecycle-sql.ts";
import {
  renderAccountDeletedNotice,
  renderChangeEmailConfirm,
  renderChangeEmailNotice,
  renderExistingAccountNotice,
  renderVerifyEmail,
} from "../lib/account/email-templates.ts";
import { canNotifyByEmail } from "../lib/notifications/config.ts";
import { DELETE_CONFIRMATION } from "../lib/account/credentials.ts";

const MIGRATION = readFileSync(new URL("../supabase/migrations/005_account_lifecycle.sql", import.meta.url), "utf8");
const openDatabases: PGlite[] = [];

async function createDb() {
  const db = new PGlite();
  openDatabases.push(db);
  await db.exec(`
    CREATE TYPE "UserPlan" AS ENUM ('FREE', 'PRO');
    CREATE TABLE "User" (
      "id" TEXT PRIMARY KEY, "email" TEXT NOT NULL UNIQUE, "plan" "UserPlan" NOT NULL DEFAULT 'FREE',
      "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    INSERT INTO "User" (id, email) VALUES ('u1', 'mario@example.it'), ('u2', 'Anna@Example.it');
  `);
  await db.exec(MIGRATION);
  await db.exec(MIGRATION);
  return db;
}

test.after(async () => {
  await Promise.all(openDatabases.map((db) => db.close()));
});

async function rows<T>(db: PGlite, query: Prisma.Sql): Promise<T[]> {
  return (await db.query<T>(query.text, query.values as unknown[])).rows;
}

async function exec(db: PGlite, query: Prisma.Sql): Promise<number> {
  return (await db.query(query.text, query.values as unknown[])).affectedRows ?? 0;
}

test("stato account: utente precedente alla migrazione è legacy, poi da confermare e confermato", async () => {
  const db = await createDb();
  let [state] = await rows<SessionStateRow>(db, sessionStateSql("u1"));
  assert.equal(state.hasState, false);
  assert.equal(state.plan, "FREE");
  assert.equal(state.email, "mario@example.it");

  await exec(db, ensureAccountStateSql("u1"));
  await exec(db, ensureAccountStateSql("u1"));
  [state] = await rows<SessionStateRow>(db, sessionStateSql("u1"));
  assert.equal(state.hasState, true);
  assert.equal(state.emailVerifiedAt, null);
  assert.equal(state.sessionVersion, 0);

  await exec(db, markEmailVerifiedSql("u1"));
  [state] = await rows<SessionStateRow>(db, sessionStateSql("u1"));
  assert.ok(state.emailVerifiedAt instanceof Date);

  assert.deepEqual(await rows(db, sessionStateSql("sconosciuto")), []);
});

test("sessioni: ogni cambio password incrementa la versione, anche per account legacy", async () => {
  const db = await createDb();
  assert.deepEqual(await rows(db, bumpSessionVersionSql("u2")), [{ sessionVersion: 1 }]);
  assert.deepEqual(await rows(db, bumpSessionVersionSql("u2")), [{ sessionVersion: 2 }]);
  const [state] = await rows<SessionStateRow>(db, sessionStateSql("u2"));
  assert.equal(state.sessionVersion, 2);
  assert.equal(state.emailVerifiedAt, null);
});

function tokenSql(id: string, hash: string, purpose: "VERIFY_EMAIL" | "CHANGE_EMAIL" = "VERIFY_EMAIL", newEmail: string | null = null, ttlSeconds = 3600) {
  return createEmailTokenSql({ id, userId: "u1", purpose, tokenHash: hash, newEmail, ttlSeconds });
}

test("token email: monouso, scadenza, scopo e revoca dei precedenti", async () => {
  const db = await createDb();
  await exec(db, tokenSql("t1", "hash-1"));
  assert.deepEqual(await rows(db, consumeEmailTokenSql("hash-1", "CHANGE_EMAIL")), []);
  assert.deepEqual(await rows(db, consumeEmailTokenSql("hash-1", "VERIFY_EMAIL")), [{ userId: "u1", newEmail: null }]);
  assert.deepEqual(await rows(db, consumeEmailTokenSql("hash-1", "VERIFY_EMAIL")), []);

  await exec(db, tokenSql("t2", "hash-2", "VERIFY_EMAIL", null, -1));
  assert.deepEqual(await rows(db, consumeEmailTokenSql("hash-2", "VERIFY_EMAIL")), []);

  await exec(db, tokenSql("t3", "hash-3"));
  await exec(db, revokeEmailTokensSql("u1", "VERIFY_EMAIL"));
  await exec(db, tokenSql("t4", "hash-4"));
  assert.deepEqual(await rows(db, consumeEmailTokenSql("hash-3", "VERIFY_EMAIL")), []);
  assert.equal((await rows(db, consumeEmailTokenSql("hash-4", "VERIFY_EMAIL"))).length, 1);

  await assert.rejects(db.query(`INSERT INTO "EmailToken" (id, "userId", purpose, "tokenHash", "expiresAt") VALUES ('x', 'u1', 'ALTRO', 'h', now())`));
});

test("cambio email: applicato solo se l'indirizzo è libero (senza distinzione maiuscole)", async () => {
  const db = await createDb();
  assert.equal(await exec(db, applyEmailChangeSql("u1", "anna@example.it")), 0);
  assert.equal(await exec(db, applyEmailChangeSql("u1", "mario.nuovo@example.it")), 1);
  const [user] = (await db.query<{ email: string }>(`SELECT email FROM "User" WHERE id = 'u1'`)).rows;
  assert.equal(user.email, "mario.nuovo@example.it");
});

test("cascade: eliminando l'utente spariscono stato e token", async () => {
  const db = await createDb();
  await exec(db, ensureAccountStateSql("u1"));
  await exec(db, tokenSql("t1", "hash-1"));
  await db.query(`DELETE FROM "User" WHERE id = 'u1'`);
  assert.equal((await db.query(`SELECT 1 FROM "AccountState"`)).rows.length, 0);
  assert.equal((await db.query(`SELECT 1 FROM "EmailToken"`)).rows.length, 0);
});

test("email account: link corretti, nessun dato superfluo", () => {
  const base = "https://www.veredoc.it";
  const verify = renderVerifyEmail({ baseUrl: base, token: "abc" });
  assert.equal(verify.subject, "Conferma il tuo indirizzo email");
  assert.ok(verify.textContent.includes("https://www.veredoc.it/verify-email?token=abc"));

  const confirm = renderChangeEmailConfirm({ baseUrl: base, token: "def", newEmail: "nuovo@example.it" });
  assert.ok(confirm.htmlContent.includes("verify-email?token=def&amp;type=change"));
  assert.ok(confirm.textContent.includes("nuovo@example.it"));

  // L'avviso al vecchio indirizzo non rivela il nuovo.
  const notice = renderChangeEmailNotice({ baseUrl: base });
  assert.ok(!notice.textContent.includes("@example.it"));
  assert.ok(notice.textContent.includes("/account"));

  assert.ok(renderExistingAccountNotice({ baseUrl: base }).textContent.includes("/login"));
  const deleted = renderAccountDeletedNotice();
  assert.ok(!deleted.htmlContent.includes("href=\"https://www.veredoc.it/"), "nessuna CTA dopo l'eliminazione");
  for (const email of [verify, confirm, notice, deleted]) assert.doesNotMatch(email.htmlContent, /<script/i);
});

test("notifiche: nessuna promessa email per indirizzi non confermati", () => {
  const env = { NOTIFICATIONS_ENABLED: "true", BREVO_API_KEY: "k" };
  assert.equal(canNotifyByEmail("mario@example.it", env, "unverified"), false);
  assert.equal(canNotifyByEmail("mario@example.it", env, "verified"), true);
  assert.equal(canNotifyByEmail("mario@example.it", env, "legacy"), true);
  assert.equal(canNotifyByEmail("mario@example.it", env), true);
  assert.equal(DELETE_CONFIRMATION, "ELIMINA");
});
