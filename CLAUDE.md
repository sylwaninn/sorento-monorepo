# CLAUDE.md: project rules

## Context

French post-bereavement support web app. A conditional rules engine (no AI)
that generates a personalised journey of procedures, benefits and letters.
Central entity: the dossier (states PREPARATION / ACTIVE), a collaborative
space shared between relatives (roles owner / collaborator / viewer /
trusted_contact). Web only: there is no mobile app, no mobile code and no
mobile workspace here, and none is to be added.

## ABSOLUTE rules (no exceptions, ever)

### UI

- shadcn/ui components ONLY, installed into apps/web/src/components/ui through
  the shadcn CLI. No custom UI component that reimplements one of them.
  Composing them is allowed and encouraged; reimplementing them is forbidden.
- Check a component's API through the shadcn MCP before using it, and prefer
  adding it with the CLI over hand-writing it. Never guess a prop.
- The registry files stay close to upstream: theme them through the tokens,
  and only extend their API when the whole app needs it (a `pending` button,
  an `asChild` title). Every deviation carries a comment saying why, and a row
  in apps/web/src/components/ui/REGISTRY.md, which also states the update
  procedure. pnpm check:styles compares the manifest against the directory.
- Tailwind everywhere else, driven by the tokens in apps/web/src/index.css.
  That file is the ONLY authored stylesheet: it holds `@theme`, the brand
  tokens and a minimal base layer. Every other style is a utility on the
  element. Enforced by pnpm check:styles.
- A colour is always a semantic token (`bg-card`, `text-muted-foreground`,
  `bg-sage`), never a raw Tailwind palette utility and never a literal.
  A recurring size, radius, shadow or type scale earns a token rather than an
  arbitrary value repeated across files. Enforced by pnpm check:styles: the
  same bracketed utility appearing in two files fails the build.
- A photograph ships as an AVIF and a JPEG at each width, declared in the feature's
  presentation catalog and rendered through OptimizedPicture, never as a bare `<img>`.
  Encode the AVIF with libaom (sharp, avifenc), never with macOS `sips`: its output carries
  the right dimensions and satisfies `complete`, `naturalWidth` and `decode()`, and Chromium
  then paints it as a fully transparent surface. Only a check that samples the pixels sees
  it, and public-quality.e2e.ts does, per viewport, because srcset is what picks the file.
- Nothing sits in apps/web/public that no source file names. A bundle drops what it does not
  import; the public directory is copied verbatim and shipped. Enforced by pnpm check:styles.
- No eyebrow or kicker label above a heading, ever: the parenthesised
  uppercase "( LABEL )" line with its coloured dot was removed deliberately
  and must never come back, nor any small tracked-out uppercase label
  introducing a section or card. A section opens with its title.

### Architecture

- packages/core: PURE business logic. Zero React imports, zero Supabase
  imports, zero I/O, injected clock. Every business rule lives here.
- packages/domain: Zod schemas + inferred types. Single source of truth.
- packages/supabase-client: the only package allowed to import
  @supabase/supabase-js.
- apps/web: assembly. A React component NEVER contains a business rule
  (no eligibility condition, no deadline computation).
- Import boundaries are enforced by ESLint (eslint-plugin-boundaries).
  This is a project rule, not a suggestion. Do not work around it.

### Front-end craft

- A component file stays under 300 lines. Past that it is doing more than one
  job, and the split is cheaper now than after the next change. Enforced by
  pnpm check:styles, which exempts tests and the shadcn registry.
- A screen never writes its own page scaffolding: the signed-in column with
  its title-and-back header is layout/PageShell, the one-card-in-the-middle
  ground is layout/CenteredShell. A page owns what is inside the shell only.
- One kind of thing per module, and a file is exactly one of them: a `content/`
  module holds French copy and nothing else, `presentation.ts` maps a content
  id to an icon or a tone, `sections/` and `components/` hold declarative
  markup, and a `use-*.ts` hook holds behaviour. A component that reads the
  scroll position, observes the viewport or holds a timer moves that logic into
  a hook beside it, where it can be tested without a screen.
- No user-facing string written in a component. Every label, alt text and
  accessible name comes from the feature's content catalog. Enforced on the
  public surface by pnpm check:styles.
- No literal URL or anchor in a component: every public destination comes from
  @/navigation. Enforced by pnpm check:styles.
- Internal navigation goes through the router, never a bare href. A full
  reload throws away the bundle the visitor has already paid for, which is the
  whole point of the route-level code splitting in routes.tsx. `asChild` is how
  a styled component borrows the router's link without knowing it exists.
- Say it once. A value repeated in two files is one rename away from
  disagreeing: name it in the theme, in the content catalog or in a shared
  constant. When two lists genuinely have to exist twice, a check compares
  them; never write the same list twice and hope.
- Nothing ships without a reader. An exported symbol, a prop, a variant, a
  theme token, a data attribute or an image that nothing reads is deleted, not
  kept in case. "In case" is what a git history is for. A token nobody names is
  worse than clutter: it reads as part of the system, so the next person picks
  it believing the design calls for it. pnpm check:styles refuses an unnamed
  theme token and an unnamed public asset; the rest is on review.
- A visual change carries its own evidence in the same commit: the Playwright
  screenshot baselines are regenerated, and a numeric layout budget the journeys
  assert is moved with the design that moved it. A stale baseline is a red suite
  nobody trusts, and the next real regression hides behind it.

### Security

- RLS enabled on every new table, policy written in the same migration.
- service_role key: Edge Functions and server-side scripts only. Never
  client-side, never in the repo, never in a file not ignored by git.
- A development-only endpoint is guarded with `env.isDevelopment`
  (supabase/functions/_shared/env.ts), checked before reading the request
  body, and answers 404 outside development. Never a client-side guard alone.
  The model is detailed in SECURITY.md.
- When a member is removed from a dossier, their assignments revert to
  "unassigned" (never an orphan reference), and the event is logged.
- Comments: soft delete with a visible trace, no editing, no reactions
  and no gamification.
- The trusted contact sees nothing while the dossier is in PREPARATION.
  Activation by the trusted contact goes through the 48 h grace period
  with a notification to every member.
- The platform admin has no access to users' dossiers, tracking, comments
  or documents.
- An agent tool call whose target names a .env path is blocked by the
  PreToolUse hook .claude/hooks/protect-env.sh: a guardrail against
  accidental access, not a sandbox against a command that resolves the
  name at run time. The committed .env.example templates and the dummy
  fixture supabase/functions/.env.test stay accessible. Real values come
  from the user, never from the file.

### TypeScript

- strict, noUncheckedIndexedAccess, exactOptionalPropertyTypes.
- Forbidden: any, @ts-ignore, convenience casts.
- Types derived from Zod (z.infer), never hand-duplicated.
- All code is in English, without exception: file names, SQL tables/columns,
  functions, variables, types. Including domain vocabulary (demarche →
  procedure, dossier stays "dossier", a valid English word). Only the text
  shown to the user (UI copy strings, catalog data) stays in French.
- All documentation is in English too, without exception: Markdown files, SQL
  comments, config comments. Same carve-out and no other: user-facing copy
  strings and catalog data stay in French.
- No "function" declared as a class method or at top level: arrow functions only,
  for components as well as for utility functions. Class methods are arrow
  class fields (`myMethod = () => {}`), never `myMethod() {}`.
- Comments in English, and exceptional: only to explain the "why" (hidden
  constraint, subtle invariant, workaround for a specific bug). Never to explain
  the "what" or the "how": clear naming already covers that.

### Writing

- **Never an em dash (U+2014). No exception, anywhere.** Not in code comments,
  not in Markdown, not in SQL comments, not in commit messages, not in pull
  request descriptions, not in user-facing French copy or catalog data. This
  file names the character by code point rather than printing it, so the rule
  survives a grep for its own violation.
- Rewrite instead of substituting. An em dash almost always marks a sentence
  doing two jobs: use a colon when what follows explains what precedes, a comma
  or parentheses for an aside, a full stop when the two halves are separate
  thoughts. A hyphen swapped in for the dash is not a fix, it is the same
  sentence punctuated worse.
- The en dash (U+2013) and the horizontal bar (U+2015) fall under the same rule.
  A hyphen in a compound word (`thirty-day`, `service-role`) is unaffected.

### Domain and compliance (sensitive context: bereavement)

- Every user-facing French string follows WORDING.md: the lexicon around
  death and money, the Organiser/Préparer journey naming, the CTA rules.
  Read it before writing or editing any copy.
- Cautious wording about entitlements and amounts: "people in a situation
  like yours may be entitled to…", never "you are entitled to".
- Systematic referrals to regulated professionals (notaire, lawyer) on
  every screen touching inheritance. Never produce individual legal advice
  or a legal instrument.
- Generated letters are templates for the user to review and sign.
- Components displaying a piece of catalog data require source_url,
  last_verified_date and caution_text as non-optional props.
- Deletions of content a person can regret losing (dossiers, comments,
  documents): soft delete + 30-day bin, purged by purge_soft_deleted().
  Never a direct hard delete.
- Closing an account is the exception, and it is an erasure, not a bin:
  someone asking to be forgotten is not asking to be kept for thirty days.
  profiles has no deleted_at on purpose. The shared history other members
  rely on survives because the foreign keys null out, so a dossier keeps its
  comments and its trace without naming whoever left. Deletion is refused
  while the person still owns a dossier, which would otherwise be orphaned.
- Emails: sober, no name of the deceased in the subject, one-click unsubscribe.
- UI never guilt-inducing: no aggressive red on overdue items, no overdue
  counter, at most 2-3 "to do now" items highlighted.

### Process

- DB schema: versioned SQL migrations only. Never a change through the
  dashboard.
- Every new business rule in core arrives WITH its unit tests. Enforced:
  pnpm check:tests refuses a module in core/domain/mappers/_shared with no
  sibling test.
- Every new RLS policy arrives WITH its integration test. Enforced: the
  policy snapshot changes, and the diff has to be accepted deliberately.
- Every new Edge Function is named by the HTTP integration suite, with the
  guard it uses, and declared in supabase/config.toml. It runs as
  service_role; an unasserted guard is an assumed guard. Enforced: check:tests
  refuses a function the suite's table does not name, a table entry pointing
  at a deleted function, and a verify_jwt that disagrees with the tested guard.
- A rule stated in both SQL and TypeScript is compared by the mirror suite.
  Never write the same list twice and hope.
- User-facing copy an E2E journey clicks on is repeated in e2e/support/copy.ts
  for the shared helpers, or in the copy-<area>.ts module beside the journey
  that uses it, because the journeys import none of the app's packages. Every
  entry goes through mirrors(), which names the dictionary it came from, and
  check:tests refuses one that has drifted. Change the wording in both, in the
  same commit.
- Email bodies interpolating anything a user typed go through escapeHtml, and
  the builder lives in _shared/emails.ts with its escaping asserted. An
  interpolation added straight into a function body is untestable by
  construction.
- Coverage thresholds are a ratchet: up, never down. Lowering one to make a
  build green is the change under review, not a fix.
- Before marking a task done: pnpm verify must pass.
- pnpm test:integration and pnpm test:e2e (both need supabase start) are NOT
  run after every task. Run them only: when explicitly asked, right before
  opening a pull request, and in GitHub CI. Assume CI covers the full suite;
  do not re-run it locally out of caution.
- A dev server started to check a change (pnpm dev, supabase start) stays up
  once the task is done. Never stop or kill it unless asked, it is running
  because the user is using it.
- Before every commit or PR: the four anti-regression guard agents in
  .claude/agents (security-regression-guard, code-practices-guard,
  design-system-guard, test-regression-guard) review the change set,
  launched in parallel, and their findings are fixed before proceeding.
  The /guards skill runs the full pass in one command.
- The full strategy, and what each layer deliberately does not cover, is in
  TESTING.md.
- Documentation follows the change that makes it stale, in the same PR.
  pnpm check:docs guards README.md's generated blocks (versions, packages,
  scripts, Edge Functions, env vars). Regenerate with pnpm sync:docs, never
  by hand. Prose sections and per-workspace READMEs are updated by hand.
- When torn between two approaches: pick the simplest one that respects
  these rules, and record the choice in a short comment.

## Commands

- pnpm dev / pnpm build / pnpm verify
- pnpm test / pnpm test:coverage / pnpm test:functions / pnpm check:tests
- pnpm test:integration / pnpm test:e2e (require supabase start)
- pnpm coverage:diff / pnpm coverage:ratchet
- pnpm sync:docs / pnpm check:docs (README generated blocks)
- supabase start / supabase db reset (replays migrations + seed)
- supabase migration new <name>
