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
  ]),
  {
    // scripts/ runs as plain Node CommonJS (package.json has no "type":
    // "module"), so require() is the correct import style here.
    files: ["scripts/**/*.js"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },
]);

export default eslintConfig;
