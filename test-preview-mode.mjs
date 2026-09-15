import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { runInNewContext } from "node:vm";
const require = createRequire(new URL("./workspaces/package.json", import.meta.url));
const ts = require("typescript");
const source = readFileSync(new URL("./workspaces/packages/core/src/preview-mode.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
test("credential-free preview is explicitly opted in and impossible in production", () => {
  for (const nodeEnv of ["production", "development", "test", undefined]) for (const flag of ["1", "0", undefined]) {
    const sandbox = { exports: {}, process: { env: { NODE_ENV: nodeEnv, NEXT_PUBLIC_LOCAL_PREVIEW: flag } } };
    runInNewContext(compiled, sandbox);
    assert.equal(sandbox.exports.isLocalPreview, nodeEnv === "development" && flag === "1", `${nodeEnv}/${flag}`);
  }
});
