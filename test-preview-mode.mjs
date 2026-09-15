import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { runInNewContext } from "node:vm";
// typescript is a workspaces devDependency, and the marketing-site CI job runs
// npm ci at the repository root only -- so it is absent there while every
// test-*.mjs at the root still gets collected. Skip rather than fail: this test
// is about workspace behaviour and has nothing to assert about the public site.
const require = createRequire(new URL("./workspaces/package.json", import.meta.url));
let ts = null;
try { ts = require("typescript"); } catch { /* workspace deps not installed */ }
test("credential-free preview is explicitly opted in and impossible in production", { skip: ts ? false : "workspaces devDependencies are not installed" }, () => {
  const source = readFileSync(new URL("./workspaces/packages/core/src/preview-mode.ts", import.meta.url), "utf8");
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  for (const nodeEnv of ["production", "development", "test", undefined]) for (const flag of ["1", "0", undefined]) {
    const sandbox = { exports: {}, process: { env: { NODE_ENV: nodeEnv, NEXT_PUBLIC_LOCAL_PREVIEW: flag } } };
    runInNewContext(compiled, sandbox);
    assert.equal(sandbox.exports.isLocalPreview, nodeEnv === "development" && flag === "1", `${nodeEnv}/${flag}`);
  }
});
