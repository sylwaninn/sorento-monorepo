import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

/**
 * Edge Functions run under Deno and share the domain and core packages, but Deno cannot
 * resolve the extensionless `#domain/*` / `#core/*` subpath imports those packages use
 * internally. The import map therefore lists every module explicitly — and this script
 * regenerates it, so adding a module to a package cannot silently break the functions.
 *
 * `--check` fails instead of writing, which is what CI runs.
 */

const root = fileURLToPath(new URL("..", import.meta.url));
const configPath = join(root, "supabase/functions/deno.json");
const supabaseConfigPath = join(root, "supabase/config.toml");
const functionsDir = join(root, "supabase/functions");

// The local edge runtime only bind-mounts what it can reach from a function's import map, and
// it looks for that map inside the function's own directory — which is not where ours lives.
// Without this explicit pointer the packages/* paths are absent from the container and every
// function importing @sorento/domain dies with "Module not found" at boot.
const IMPORT_MAP_LINE = 'import_map = "./functions/deno.json"';

const functionSlugs = () =>
  readdirSync(functionsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith("_"))
    .map((entry) => entry.name)
    .sort();

/**
 * verify_jwt is a security decision, so a missing block is reported rather than generated with
 * a guessed default. This only ever reports.
 */
const configTomlProblems = () => {
  const toml = readFileSync(supabaseConfigPath, "utf8");
  const problems = [];

  for (const slug of functionSlugs()) {
    const header = `[functions.${slug}]`;
    const start = toml.indexOf(`\n${header}\n`);
    if (start === -1) {
      problems.push(`${header} is missing from supabase/config.toml`);
      continue;
    }
    const rest = toml.slice(start + 1);
    const end = rest.indexOf("\n[");
    const block = end === -1 ? rest : rest.slice(0, end);
    if (!block.includes(IMPORT_MAP_LINE)) {
      problems.push(`${header} is missing: ${IMPORT_MAP_LINE}`);
    }
  }

  return problems;
};

const modulesOf = (packageName) =>
  readdirSync(join(root, "packages", packageName, "src"))
    .filter((file) => file.endsWith(".ts") && !file.endsWith(".test.ts"))
    .map((file) => file.replace(/\.ts$/, ""))
    .filter((name) => name !== "index" && name !== "test-fixtures")
    .sort();

const buildImports = () => {
  const imports = {
    "@shared/": "./_shared/",
    "@sorento/domain": "../../packages/domain/src/index.ts",
  };
  for (const module of modulesOf("domain")) {
    imports[`#domain/${module}`] = `../../packages/domain/src/${module}.ts`;
  }
  imports["@sorento/core"] = "../../packages/core/src/index.ts";
  for (const module of modulesOf("core")) {
    imports[`#core/${module}`] = `../../packages/core/src/${module}.ts`;
  }
  imports["zod"] = "npm:zod@^3.24.1";
  imports["@supabase/supabase-js"] = "npm:@supabase/supabase-js@^2.47.10";
  return imports;
};

const config = JSON.parse(readFileSync(configPath, "utf8"));
const expected = buildImports();
const isCheck = process.argv.includes("--check");

const problems = configTomlProblems();
if (problems.length > 0) {
  console.error(problems.map((problem) => `  - ${problem}`).join("\n"));
  console.error(
    "\nEvery Edge Function needs its import map declared, or it will not boot locally.",
  );
  process.exit(1);
}

if (JSON.stringify(config.imports) === JSON.stringify(expected)) {
  process.exit(0);
}

if (isCheck) {
  console.error(
    "supabase/functions/deno.json is out of date with the package sources. Run: pnpm sync:functions-imports",
  );
  process.exit(1);
}

config.imports = expected;
writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`);
console.log("supabase/functions/deno.json updated");
