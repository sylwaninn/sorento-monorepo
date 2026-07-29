import { baseConfig } from "@sorento/config/eslint-base";
import { boundariesConfig } from "@sorento/config/eslint-boundaries";

export default [
  { ignores: ["test-results/**", "playwright-report/**"] },
  ...baseConfig,
  ...boundariesConfig,
];
