import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { coverageConfig } from "@sorento/config/vitest-coverage";

/**
 * web is the assembly layer: it holds no business rule, so its coverage will never approach
 * core's, and demanding that it should would only buy tests written to move a number.
 *
 * These thresholds are a ratchet at today's level, not a target that has been met. They exist so
 * the number can only go up: new screens shipped without tests dilute the ratio and break the
 * build, which is the intended pressure. Raise them as coverage grows; never lower one to make a
 * red build green.
 *
 * The floor under all of them is the route smoke suite, which mounts every screen the route table
 * declares. Fifteen or so screens are covered by that alone, meaning their loading branch and
 * nothing else. Where a percentage here is worth reading is per file, not in aggregate.
 */
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "jsdom",
    globals: false,
    setupFiles: ["./src/test/setup.ts"],
    coverage: coverageConfig({
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        // Copy dictionaries and route/entry wiring: data and composition, no behaviour.
        "src/**/content.ts",
        "src/main.tsx",
        "src/routes.tsx",
        "src/test/**",
      ],
      thresholds: { lines: 54, statements: 54, functions: 60, branches: 71 },
    }),
  },
});
