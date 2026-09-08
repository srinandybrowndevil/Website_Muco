import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import test from "node:test";
import ts from "typescript";
const exports = {};
const source = readFileSync(new URL("./src/lib/crm.ts", import.meta.url), "utf8");
runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, { exports });
const { recordPayload } = exports;

test("lead save converts currency to a number and cannot write role or workspace fields", () => {
  const payload = recordPayload("leads", { name: "  Example lead  ", stage: "qualified", estimated_value: "75000.50", role: "admin", organization_id: "another-org" });
  assert.equal(payload.name, "Example lead");
  assert.equal(payload.estimated_value, 75000.50);
  assert.equal("role" in payload, false);
  assert.equal("organization_id" in payload, false);
});
test("empty required name is rejected before any write", () => {
  assert.throws(() => recordPayload("leads", { name: " ", stage: "new", estimated_value: "0" }), /required/);
});
test("unknown stages and nonfinite amounts cannot be saved", () => {
  assert.throws(() => recordPayload("leads", { name: "Test", stage: "admin", estimated_value: "0" }), /valid/);
  assert.throws(() => recordPayload("leads", { name: "Test", stage: "new", estimated_value: "Infinity" }), /Check/);
  assert.throws(() => recordPayload("leads", { name: "Test", stage: "new", estimated_value: "-1" }), /Check/);
});
test("invoice requires a customer and tracks paid status", () => {
  assert.throws(() => recordPayload("invoices", { number: "INV-1", amount: "100", status: "draft" }), /Customer/);
  const payload = recordPayload("invoices", { number: "INV-1", customer_id: "customer", amount: "100", status: "paid" });
  assert.equal(typeof payload.paid_at, "string");
});
test("task completion is reversible and due time is normalized", () => {
  const fields = { title: "Follow up", status: "completed", priority: "2", due_at: "2026-09-09T10:00" };
  const completed = recordPayload("tasks", fields);
  assert.ok(completed.completed_at);
  assert.equal(new Date(completed.due_at).getTime(), new Date(fields.due_at).getTime());
  assert.equal(recordPayload("tasks", { ...fields, status: "open" }).completed_at, null);
});
test("project progress is bounded and unknown sections are rejected", () => {
  assert.throws(() => recordPayload("projects", { name: "Build", status: "active", progress: "101" }), /Check/);
  assert.throws(() => recordPayload("memberships", {}), /Unknown/);
});
