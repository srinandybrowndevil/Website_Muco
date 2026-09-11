import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// The flat config eslint-config-next actually ships. An eslintrc-style
// FlatCompat wrapper round it throws "Converting circular structure to JSON"
// on ESLint 9, which reads as a broken repository rather than a broken config
// file -- so it is worth keeping this in the shape the package expects.
export default defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts"]),
]);
