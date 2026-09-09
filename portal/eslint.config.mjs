import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // A dev server started from the wrong directory builds into portal/portal.
    // scripts/dev-portal.mjs pins the cwd, but linting a stray Next.js bundle
    // buries real findings under thousands of generated-code warnings.
    "portal/**",
  ]),
]);

export default eslintConfig;
