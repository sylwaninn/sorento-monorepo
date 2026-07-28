#!/usr/bin/env node
/**
 * Runs a shell command only when a path exists. The repository lands as a stack of
 * branches, and some gates audit a tree a later branch introduces (the Deno checks need
 * supabase/functions): before that tree exists the gate has nothing to say, and a crash
 * on a missing directory would block `pnpm verify` on every branch underneath.
 */

import { execSync } from "node:child_process";
import { existsSync } from "node:fs";

const [target, command] = process.argv.slice(2);

if (!target || !command) {
  console.error("usage: node scripts/run-if-exists.mjs <path> <command>");
  process.exit(1);
}

if (!existsSync(target)) {
  console.log(`run-if-exists: ${target} does not exist, skipping: ${command}`);
  process.exit(0);
}

try {
  execSync(command, { stdio: "inherit" });
} catch (error) {
  process.exit(typeof error.status === "number" ? error.status : 1);
}
