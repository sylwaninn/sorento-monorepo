import { baseConfig } from "@sorento/config/eslint-base";
import { boundariesConfig } from "@sorento/config/eslint-boundaries";

export default [
  {
    ignores: [
      "**/dist/**",
      "**/.turbo/**",
      "**/node_modules/**",
      "supabase/functions/**",
      // Generated: Stryker's instrumented sources and the coverage/mutation reports.
      "**/.stryker-tmp/**",
      "**/reports/**",
      "**/coverage/**",
    ],
  },
  ...baseConfig,
  ...boundariesConfig,

  // Node tooling that no workspace `lint` script reaches: `turbo run lint` only visits the
  // packages, so these files are linted solely through lint-staged and the root run. They
  // execute under Node, where these three are defined.
  {
    files: ["scripts/**/*.mjs", "packages/config/**/*.js", "**/*.config.js"],
    languageOptions: {
      globals: { console: "readonly", process: "readonly", URL: "readonly" },
    },
  },
];
