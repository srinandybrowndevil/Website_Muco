import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";

const require = createRequire(import.meta.url);

// Execute the actual handler with an isolated Supabase boundary; no emails or
// database writes are needed to verify where a completed recovery redirects.
function loadTs(path, imports = {}) {
  const source = readFileSync(new URL(path, import.meta.url), "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  const exports = {};
  runInNewContext(outputText, {
    exports, URL, process,
    require: (name) => imports[name] ?? require(name),
  });
  return exports;
}

async function callback(next, role, { invalidCode = false, signedIn = true } = {}) {
  const query = {
    select() { return this; },
    eq() { return this; },
    limit() { return this; },
    async maybeSingle() { return { data: role ? { role } : null }; },
  };
  const client = {
    auth: {
      async exchangeCodeForSession() { return { error: invalidCode ? new Error("Expired") : null }; },
      async getUser() { return { data: { user: signedIn ? { id: "test-user" } : null } }; },
    },
    from() { return query; },
  };
  const { GET } = loadTs("./src/app/auth/callback/route.ts", {
    "@/lib/auth": loadTs("./src/lib/auth.ts"),
    "@/lib/supabase/server": { createClient: async () => client },
  });
  const url = new URL("https://portal.example/auth/callback?code=recovery-code");
  if (next) url.searchParams.set("next", next);
  const response = await GET(new Request(url));
  return response.headers.get("location");
}

for (const role of ["client", "admin", "member", null]) {
  test(`recovery reaches password reset for ${role ?? "a user without membership"}`, async () => {
    assert.equal(await callback("/reset-password", role), "https://portal.example/reset-password");
  });
}

test("expired recovery codes stay on the authentication error page", async () => {
  assert.equal(await callback("/reset-password", "client", { invalidCode: true }),
    "https://portal.example/auth/error?reason=callback");
});

test("recovery requires a verified user after the code exchange", async () => {
  assert.equal(await callback("/reset-password", "client", { signedIn: false }),
    "https://portal.example/auth/error?reason=callback");
});

test("ordinary customer sign-in still goes to the customer portal", async () => {
  assert.equal(await callback("/enquiries", "client"), "https://portal.example/portal");
});

test("external redirects are rejected", async () => {
  assert.equal(await callback("https://external.example/reset-password", "client"),
    "https://portal.example/portal");
});

test("invitation tokens survive the callback", async () => {
  assert.equal(await callback("/accept-invite?token=test-token", null),
    "https://portal.example/accept-invite?token=test-token");
});
