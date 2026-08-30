import assert from "node:assert/strict";
import test from "node:test";
import { isDocumentOwner, isJobRequestAuthorized } from "../lib/security/access.ts";

test("job auth rifiuta secret non configurato", () => {
  assert.equal(isJobRequestAuthorized("Bearer undefined", undefined), false);
  assert.equal(isJobRequestAuthorized("Bearer qualsiasi", ""), false);
});

test("job auth rifiuta header assente o malformato", () => {
  assert.equal(isJobRequestAuthorized(null, "super-secret"), false);
  assert.equal(isJobRequestAuthorized("super-secret", "super-secret"), false);
  assert.equal(isJobRequestAuthorized("Basic super-secret", "super-secret"), false);
  assert.equal(isJobRequestAuthorized("Bearer ", "super-secret"), false);
});

test("job auth rifiuta secret errato", () => {
  assert.equal(isJobRequestAuthorized("Bearer secret-errato", "super-secret"), false);
});

test("job auth accetta solo il bearer secret corretto", () => {
  assert.equal(isJobRequestAuthorized("Bearer super-secret", "super-secret"), true);
});

test("ownership documento accetta solo il proprietario autenticato", () => {
  assert.equal(isDocumentOwner("user-1", "user-1"), true);
  assert.equal(isDocumentOwner("user-2", "user-1"), false);
  assert.equal(isDocumentOwner(undefined, "user-1"), false);
});
