#!/usr/bin/env node
import { readdirSync, readFileSync } from "node:fs";
import { extname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const WEB_SOURCE = join(ROOT, "apps/web/src");
/** The single authored stylesheet: tokens and base layer only, everything else is a utility. */
const THEME_ENTRY = "apps/web/src/index.css";
const CODE_EXTENSIONS = new Set([".ts", ".tsx"]);
const SHARED_COMPONENTS = "apps/web/src/components/";
/** The shadcn registry lives here. Its files are upstream's shape, not ours to restyle. */
const REGISTRY = "apps/web/src/components/ui/";
/**
 * A component past this length is doing more than one job, and the split is always cheaper now
 * than after the next change. Tests are exempt: their length tracks how much they cover.
 */
const COMPONENT_LINE_LIMIT = 300;
/** Where the single navigation source is enforced. Elsewhere the router still owns its literals. */
const PUBLIC_SURFACE = [
  "apps/web/src/components/",
  "apps/web/src/features/landing/",
  "apps/web/src/features/legal/",
];
/** The one module allowed a native anchor: deciding how a destination is reached is its job. */
const ROUTE_LINK = "apps/web/src/components/RouteLink.tsx";
/** Everything the built site serves as-is. Each file has to be named by something in src. */
const PUBLIC_ASSETS = join(ROOT, "apps/web/public");
/** The utility families a colour token and a spacing token answer to, for the unused-token audit. */
const COLOUR_PREFIXES = [
  "bg-",
  "text-",
  "border-",
  "ring-",
  "outline-",
  "fill-",
  "stroke-",
  "from-",
  "via-",
  "to-",
  "shadow-",
  "decoration-",
  "divide-",
  "accent-",
  "caret-",
  "placeholder-",
];
const SPACING_PREFIXES = [
  "p-",
  "px-",
  "py-",
  "pt-",
  "pb-",
  "pl-",
  "pr-",
  "m-",
  "mx-",
  "my-",
  "mt-",
  "mb-",
  "ml-",
  "mr-",
  "gap-",
  "space-x-",
  "space-y-",
  "w-",
  "h-",
  "size-",
  "min-w-",
  "min-h-",
  "max-w-",
  "max-h-",
  "basis-",
  "top-",
  "bottom-",
  "left-",
  "right-",
  "inset-",
  "translate-x-",
  "translate-y-",
  "scroll-mt-",
  "indent-",
];
const failures = [];

const walk = (directory) =>
  readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? walk(path) : [path];
  });

/** Where a match sits, as path:line, so a failure is a clickable address rather than a hunt. */
const matchAddress = (projectPath, source, index) =>
  `${projectPath}:${source.slice(0, index).split("\n").length}`;

for (const file of walk(WEB_SOURCE)) {
  const projectPath = relative(ROOT, file);

  if (extname(file) === ".css" && projectPath !== THEME_ENTRY) {
    failures.push(
      `${projectPath}: authored CSS belongs in ${THEME_ENTRY}; everywhere else, use utilities`,
    );
    continue;
  }

  if (!CODE_EXTENSIONS.has(extname(file))) continue;

  const source = readFileSync(file, "utf8");
  const isRegistry = projectPath.startsWith(REGISTRY);
  const checks = [
    {
      pattern: /\bstyle\s*=/,
      message: "inline style prop; use a utility, or a CSS variable the theme already defines",
      // The registry drives a few transforms from a live value; a utility cannot hold one.
      skipRegistry: true,
    },
    {
      pattern: /#[\da-f]{3,8}\b/i,
      message: "hard-coded color; use a semantic theme token",
    },
    {
      pattern: /\b(?:rgb|rgba|hsl|hsla|oklch)\s*\(/i,
      message: "hard-coded color function; use a semantic theme token",
    },
    {
      pattern:
        /\b(?:bg|text|border|ring|outline|fill|stroke)-(?:white|black|red|green|blue|yellow|gray|slate|zinc|neutral|stone|amber|lime|emerald|teal|cyan|sky|indigo|violet|purple|fuchsia|pink|rose)(?:[-/][^\s"'`]+)?/,
      message: "raw palette utility; use a semantic colour from the theme",
      // The registry ships upstream classes; the theme is what makes them ours.
      skipRegistry: true,
    },
  ];

  for (const check of checks) {
    if (check.skipRegistry === true && isRegistry) continue;
    const match = check.pattern.exec(source);
    if (match) failures.push(`${matchAddress(projectPath, source, match.index)}: ${check.message}`);
  }

  const isTest = projectPath.endsWith(".test.ts") || projectPath.endsWith(".test.tsx");

  if (extname(file) === ".tsx" && !isTest && !isRegistry) {
    const lines = source.trimEnd().split("\n").length;
    if (lines > COMPONENT_LINE_LIMIT) {
      failures.push(
        `${projectPath}: ${lines} lines, over the ${COMPONENT_LINE_LIMIT}-line component limit; extract the parts that stand on their own`,
      );
    }
  }

  // Shared components are imported by every feature. One import the other way and the graph has
  // a cycle: the thing everyone depends on now depends on one of them.
  if (projectPath.startsWith(SHARED_COMPONENTS) && !isTest) {
    const featureImport = /from "(@\/features\/[^"]+)"/.exec(source);
    if (featureImport) {
      failures.push(
        `${matchAddress(projectPath, source, featureImport.index)}: imports ${featureImport[1]}; a shared component cannot depend on a feature, pass the value in or move it to the shared catalog`,
      );
    }
  }

  const isPublicSurface =
    PUBLIC_SURFACE.some((directory) => projectPath.startsWith(directory)) && !isRegistry;

  if (isPublicSurface && !isTest) {
    const literalHref = /\b(?:href|to)=["'](?:\/|#)[^"']*["']/.exec(source);
    if (literalHref) {
      failures.push(
        `${matchAddress(projectPath, source, literalHref.index)}: hard-coded destination ${literalHref[0]}; every public URL and anchor comes from @/navigation`,
      );
    }

    // A native anchor is a full page reload, which throws away the bundle the visitor has already
    // downloaded and undoes the route-level splitting in routes.tsx. The registry is exempt: it is
    // where the anchor and the button primitives legitimately live.
    const nativeElement = projectPath === ROUTE_LINK ? null : /<(?:a|button)[\s>]/.exec(source);
    if (nativeElement) {
      failures.push(
        `${matchAddress(projectPath, source, nativeElement.index)}: native <a> or <button>; use RouteLink, RouteAnchor, Link or Button so the destination and the public tone stay in one place`,
      );
    }
  }

  if (
    projectPath.startsWith("apps/web/src/features/landing/") &&
    extname(file) === ".tsx" &&
    !projectPath.endsWith(".test.tsx")
  ) {
    const landingChecks = [
      {
        pattern: /<Card(?:\s|>)/,
        message: "direct Card root; use PublicCard so the shared tone contract stays enforced",
      },
      {
        pattern: /\baria-label\s*=\s*["'][^"']+["']/,
        message: "hard-coded accessible copy; move it to the landing content catalog",
      },
      {
        pattern: /\balt\s*=\s*["'][^"']+["']/,
        message: "hard-coded image copy; move it to the landing content catalog",
      },
      {
        pattern: />\s*[A-Za-zÀ-ÿ][A-Za-zÀ-ÿ'’ -]*\s*</,
        message: "hard-coded visible copy; move it to the landing content catalog",
      },
    ];

    for (const check of landingChecks) {
      const match = check.pattern.exec(source);
      if (match) {
        failures.push(`${matchAddress(projectPath, source, match.index)}: ${check.message}`);
      }
    }
  }
}

/**
 * The type scale is declared in the stylesheet and repeated in lib/theme.ts, because
 * tailwind-merge has to be told which `text-*` utilities are sizes rather than colours. Two
 * copies of a list is exactly the thing that drifts, so the drift is what this compares.
 */
const themeSource = readFileSync(join(ROOT, THEME_ENTRY), "utf8");
const declaredFontSizes = [...themeSource.matchAll(/^\s*--text-([a-z\d-]+):/gm)]
  .map((match) => match[1])
  .filter((name) => !name.endsWith("--line-height") && !name.endsWith("--letter-spacing"));
const mirroredFontSizes = [
  ...readFileSync(join(WEB_SOURCE, "lib/theme.ts"), "utf8").matchAll(/^\s*"([a-z\d-]+)",$/gm),
].map((match) => match[1]);
const missingFromMirror = declaredFontSizes.filter((name) => !mirroredFontSizes.includes(name));
const staleInMirror = mirroredFontSizes.filter((name) => !declaredFontSizes.includes(name));

if (missingFromMirror.length > 0 || staleInMirror.length > 0) {
  failures.push(
    `apps/web/src/lib/theme.ts: the type scale has drifted from ${THEME_ENTRY}` +
      (missingFromMirror.length > 0 ? `; missing ${missingFromMirror.join(", ")}` : "") +
      (staleInMirror.length > 0 ? `; no longer declared ${staleInMirror.join(", ")}` : ""),
  );
}

/**
 * Every asset the site serves as-is has to be named by something in the source.
 *
 * A photograph nobody references is not dead weight in a bundle, where the compiler would have
 * dropped it: it is copied into the build and shipped, and nothing ever renders it. Four of them
 * had accumulated that way, at four hundred kilobytes.
 */
const publicPathOf = (file) => `/${relative(PUBLIC_ASSETS, file).split(sep).join("/")}`;
const referenceHaystack = [
  ...walk(WEB_SOURCE)
    .filter((file) => CODE_EXTENSIONS.has(extname(file)))
    .map((file) => readFileSync(file, "utf8")),
  readFileSync(join(ROOT, "apps/web/index.html"), "utf8"),
].join("\n");

for (const asset of walk(PUBLIC_ASSETS)) {
  const served = publicPathOf(asset);
  // Dotfiles are Finder litter rather than assets anyone chose to publish, and they are
  // gitignored, so failing a local build over one would punish opening a folder.
  if (served.split("/").some((segment) => segment.startsWith("."))) continue;
  if (!referenceHaystack.includes(served)) {
    failures.push(
      `apps/web/public${served}: served by the site and named by nothing in src; render it or delete it`,
    );
  }
}

/**
 * The theme namespaces Tailwind turns into utilities, and the utility prefixes each one answers
 * to. Longest namespace first: `--font-weight-strong` belongs to `--font-weight-`, not `--font-`.
 */
const THEME_NAMESPACES = [
  ["--grid-template-columns-", ["grid-cols-"]],
  ["--font-weight-", ["font-"]],
  ["--container-", ["max-w-", "min-w-", "w-"]],
  ["--tracking-", ["tracking-"]],
  ["--spacing-", SPACING_PREFIXES],
  ["--shadow-", ["shadow-"]],
  ["--radius-", ["rounded-"]],
  ["--animate-", ["animate-"]],
  ["--color-", COLOUR_PREFIXES],
  ["--text-", ["text-"]],
  ["--ease-", ["ease-"]],
  ["--font-", ["font-"]],
];

/**
 * A token nothing names is a decision nobody made: it reads as part of the system, it turns up in
 * autocomplete, and the next person picks it believing the design calls for it. Thirteen of them
 * had piled up, including three shadows and a whole entry in the type scale.
 *
 * Declaration lines are stripped from the haystack first, or `--text-caption:` would count as a
 * use of `text-caption`. A token aliased by another token counts: that is a reader.
 */
const themeBlock = /@theme[^{]*\{([\s\S]*)\n\}/.exec(themeSource)?.[1] ?? "";
const styleUsage = themeSource.replace(/^\s*--[a-z\d-]+:.*$/gm, "");
const utilityHaystack = `${referenceHaystack}\n${styleUsage}`;
const unusedTokens = [];

for (const [, name] of themeBlock.matchAll(/^\s*(--[a-z\d-]+):/gm)) {
  if (name.endsWith("--line-height") || name.endsWith("--letter-spacing")) continue;

  const namespace = THEME_NAMESPACES.find(([prefix]) => name.startsWith(prefix));
  if (namespace === undefined) continue;

  const [prefix, utilities] = namespace;
  const suffix = name.slice(prefix.length);
  const isNamed =
    themeSource.includes(`var(${name})`) ||
    utilities.some((utility) =>
      new RegExp(`[\\s"'\`:({\\[/-]${utility}${suffix}(?![a-z\\d-])`).test(utilityHaystack),
    );

  if (!isNamed) unusedTokens.push(`${name} (no ${utilities[0]}${suffix})`);
}

if (unusedTokens.length > 0) {
  failures.push(
    `${THEME_ENTRY}: theme tokens nothing names; delete them or use them: ${unusedTokens.join(", ")}`,
  );
}

const landingPresentation = readFileSync(
  join(WEB_SOURCE, "features/landing/presentation.ts"),
  "utf8",
);
if (/export const \w*Icons?\s*=\s*\[/.test(landingPresentation)) {
  failures.push(
    "apps/web/src/features/landing/presentation.ts: icon arrays couple visuals to content order; use an ID-keyed record",
  );
}

/**
 * A recurring arbitrary value is a token someone declined to name.
 *
 * A one-off `min-h-[calc(100svh-5rem)]` beside the comment explaining it is fine: that is what
 * arbitrary values are for. The same bracketed utility appearing in two files is the moment the
 * rule in CLAUDE.md fires ("a recurring size earns a token"), and nothing else would ever say
 * so: each file looks reasonable on its own. Variants are stripped first so `md:p-[2rem]` and
 * `p-[2rem]` count as the same decision. The registry is exempt: its classes are upstream's.
 */
const arbitraryUsage = new Map();

for (const file of walk(WEB_SOURCE)) {
  const projectPath = relative(ROOT, file);
  if (!CODE_EXTENSIONS.has(extname(file))) continue;
  if (projectPath.startsWith(REGISTRY)) continue;
  if (projectPath.endsWith(".test.ts") || projectPath.endsWith(".test.tsx")) continue;

  const source = readFileSync(file, "utf8");
  for (const [, quoted] of source.matchAll(/["'`]([^"'`]*)["'`]/g)) {
    for (const utility of quoted.split(/\s+/)) {
      if (!/^[\w!:*&>~[\]/().,%#-]+-\[[^\]]+\]$/.test(utility)) continue;
      const bracketAt = utility.indexOf("[");
      const variantEnd = utility.slice(0, bracketAt).lastIndexOf(":");
      const canonical = variantEnd === -1 ? utility : utility.slice(variantEnd + 1);
      const users = arbitraryUsage.get(canonical) ?? new Set();
      users.add(projectPath);
      arbitraryUsage.set(canonical, users);
    }
  }
}

for (const [utility, users] of arbitraryUsage) {
  if (users.size < 2) continue;
  failures.push(
    `${[...users].sort().join(", ")}: the arbitrary value ${utility} recurs; a recurring size earns a token in ${THEME_ENTRY}`,
  );
}

/**
 * The registry manifest and the registry directory, compared in both directions.
 *
 * The registry is a copy of code that lives upstream, and a copy drifts silently: a file added
 * by hand, or deleted without its row, is a decision nobody wrote down. REGISTRY.md is where it
 * is written down, with the deviations upstream will overwrite on the next `shadcn diff` pass.
 */
const REGISTRY_MANIFEST = join(ROOT, REGISTRY, "REGISTRY.md");
const manifestEntries = [...readFileSync(REGISTRY_MANIFEST, "utf8").matchAll(/^\| `([^`]+)`/gm)]
  .map((match) => match[1])
  .filter((name) => name !== "File");
const registryFiles = walk(join(ROOT, REGISTRY))
  .map((file) => relative(join(ROOT, REGISTRY), file).split(sep).join("/"))
  .filter((name) => name !== "REGISTRY.md");

for (const name of registryFiles) {
  if (!manifestEntries.includes(name)) {
    failures.push(
      `${REGISTRY}${name}: in the registry but not in REGISTRY.md; declare where it comes from and how it deviates`,
    );
  }
}
for (const name of manifestEntries) {
  if (!registryFiles.includes(name)) {
    failures.push(`${REGISTRY}REGISTRY.md: names ${name}, which is gone; drop the row`);
  }
}

if (failures.length > 0) {
  console.error(
    ["Web style audit failed:", ...failures.map((failure) => `- ${failure}`)].join("\n"),
  );
  process.exitCode = 1;
} else {
  console.log(
    `Web style audit passed: colours, layout contracts and public URLs are controlled by ${THEME_ENTRY} and the shared components.`,
  );
}
