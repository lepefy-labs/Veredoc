import assert from "node:assert/strict";
import test from "node:test";
import { resolveEntitlements } from "../lib/account/entitlements.ts";

test("mantiene quote e accesso PDF API dei piani esistenti", () => {
  assert.deepEqual(resolveEntitlements("FREE"), { plan: "FREE", monthlyAnalyses: 10, pdfApiUpload: false });
  assert.deepEqual(resolveEntitlements("PRO"), { plan: "PRO", monthlyAnalyses: 30, pdfApiUpload: true });
  assert.deepEqual(resolveEntitlements(undefined), resolveEntitlements("FREE"));
});
