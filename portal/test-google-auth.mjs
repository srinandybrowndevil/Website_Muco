import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const login = fs.readFileSync(new URL("./src/app/login/page.tsx", import.meta.url), "utf8");
const signup = fs.readFileSync(new URL("./src/app/signup/page.tsx", import.meta.url), "utf8");

for (const [name, source] of [["login", login], ["signup", signup]]) {
  test(`${name} exposes Google OAuth with callback destination`, () => {
    assert.match(source, /signInWithOAuth/);
    assert.match(source, /provider:\s*["']google["']/);
    assert.match(source, /\/auth\/callback\?next=/);
    assert.match(source, /withTimeout/);
    assert.match(source, /10000/);
  });
}

test("customer auth offers both sign-in and sign-up actions", () => {
  assert.match(login, /Continue with Google/);
  assert.match(login, /Create a customer account/);
  assert.match(signup, /Sign up with Google/);
});
