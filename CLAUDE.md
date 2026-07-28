# CLAUDE.md: project rules

## Context

French post-bereavement support web app. A conditional rules engine (no AI)
that generates a personalised journey of procedures, benefits and letters.
Central entity: the dossier (states PREPARATION / ACTIVE), a collaborative
space shared between relatives (roles owner / collaborator / viewer /
trusted_contact). Web only. Mobile comes later: never build a mobile app, but
keep the packages reusable.

## ABSOLUTE rules (no exceptions, ever)

### UI

- HeroUI components ONLY. No custom UI component that reimplements a HeroUI
  equivalent. Composing HeroUI components is allowed and encouraged;
  reimplementing them is forbidden.
- Check every component's API through the HeroUI MCP before using it.
  Never guess a prop.
- Tailwind for layout/spacing only, never to rebuild components or to
  override HeroUI's internal styles.

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
- User-facing copy an E2E journey clicks on is repeated in e2e/support/copy.ts,
  because the journeys import none of the app's packages. Every entry names the
  dictionary it came from and check:tests refuses one that has drifted. Change
  the wording in both, in the same commit.
- Email bodies interpolating anything a user typed go through escapeHtml, and
  the builder lives in _shared/emails.ts with its escaping asserted. An
  interpolation added straight into a function body is untestable by
  construction.
- Coverage thresholds are a ratchet: up, never down. Lowering one to make a
  build green is the change under review, not a fix.
- Before marking a task done: pnpm verify must pass. When the change touches
  the database, an Edge Function or a user journey, also pnpm test:integration
  and pnpm test:e2e (both need supabase start).
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
