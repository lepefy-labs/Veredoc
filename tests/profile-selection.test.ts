import assert from "node:assert/strict";
import test from "node:test";
import { resolveProfileId } from "../lib/profiles/selection.ts";

const profiles = [
  { id: "me", label: "Io", kind: "PERSON", isDefault: true },
  { id: "family", label: "Mamma", kind: "PERSON", isDefault: false },
  { id: "home", label: "Casa Milano", kind: "HOUSEHOLD", isDefault: false },
];

test("mantiene il profilo richiesto quando appartiene alla lista disponibile", () => {
  assert.equal(resolveProfileId(profiles, "family"), "family");
});

test("usa il profilo predefinito quando quello richiesto non esiste", () => {
  assert.equal(resolveProfileId(profiles, "foreign-profile"), "me");
});

test("usa il primo profilo quando non esiste un predefinito", () => {
  assert.equal(resolveProfileId(profiles.map((profile) => ({ ...profile, isDefault: false })), null), "me");
});

test("restituisce null quando l'account non ha profili", () => {
  assert.equal(resolveProfileId([], null), null);
});
