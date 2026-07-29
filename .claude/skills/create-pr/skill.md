---
name: create-pr
description: Create and push a new feature branch with a pull request following project conventions
allowed-tools: Bash(git:*), Bash(gh:*), Bash(pnpm:*), Read, Grep, Glob, Agent, Skill(technical-writer)
argument-hint: [branch-name] [pr-title]
---

# Create Pull Request

Automate the creation of a feature branch, commits, and pull request following all project conventions.

## Current State

- Current branch: !`git rev-parse --abbrev-ref HEAD`
- Git status: !`git status --short`
- Uncommitted changes: !`git diff --stat`

## Arguments

- `$ARGUMENTS[0]`: Branch name (e.g., `feat/my-feature` or just `my-feature`)
- `$ARGUMENTS[1]`: PR title (optional, will be generated from commits if not provided)

## Workflow Steps

### 1. Branch Creation

If not already on a feature branch:

- Create a new branch following naming conventions:
  - `feat/feature-name` for new features
  - `fix/bug-description` for bug fixes
  - `chore/maintenance-task` for maintenance
  - `hotfix/critical-fix` for production hotfixes
- Checkout the new branch

### 2. Staged Changes Review

- Review all staged and unstaged changes with `git diff`
- **Identify logical groups of changes for separate commits** (see step 3)
- Ensure no sensitive files are staged (.env, credentials, etc.)

### 3. Create Scoped Commits (MANDATORY: multiple commits)

**NEVER create a single monolithic commit for all changes.** Always split changes into multiple scoped commits, each representing one logical unit of work.

**How to split commits:**

1. Analyze all changed files and group them by concern:
   - Domain schemas (packages/domain) and business rules with their tests
     (packages/core)
   - Database migrations, RLS policies and Edge Functions (supabase)
   - UI assembly (apps/web: screens, components, routing)
   - E2E journeys and their copy mirrors (e2e)
   - Refactoring (renaming, extracting, restructuring existing code)
   - Configuration (build, linting, CI)
   - Bug fixes
2. Each group becomes its own commit
3. Order commits logically: foundational changes first, dependent changes
   after (domain, then core, then supabase, then web, then e2e)

**Example split for a new benefit journey:**

```
feat(domain): add allowance schema and inferred types
feat(core): add allowance eligibility rule with unit tests
feat(supabase): add allowance catalog migration with RLS and tests
feat(web): add allowance screen composing HeroUI components
test(e2e): cover the allowance journey with its copy mirror
```

**For each commit:**

1. Stage only the relevant files: `git add <specific-files>` (never `git add .` or `git add -A`)
2. Create commit following **MANDATORY** rules:
   - Follow `.claude/rules/commits.md`, the single source for format,
     types, scope vocabulary and examples: `type(scope): description`,
     one line only, imperative, lowercase, scope from that file's list
   - Two examples, the rest live in commits.md:
     - `feat(web): add dossier activation screen`
     - `fix(supabase): escape user-supplied text in outbound emails`

3. **NEVER use `--no-verify`**, all commits must pass pre-commit hooks
4. If hooks fail, fix the issues and retry

### 4. Run Verification

Before pushing, ensure quality:

```bash
pnpm verify
```

This must pass with zero warnings/errors. Fix any issues before proceeding.

### 4b. Anti-regression Guards (MANDATORY)

Run the four guard agents on the branch diff, in parallel (a single
message with four Agent calls): `security-regression-guard`,
`code-practices-guard`, `design-system-guard`, `test-regression-guard`.
The `/guards` skill does exactly this in one step.

- Fix every critical and high finding, then rerun the affected guard
  until it is clean.
- Medium and low findings: fix them, or record why not in the PR
  description.

### 5. Update Documentation (MANDATORY check, conditional update)

**5.1. Deterministic check first.** Run:

```bash
pnpm check:docs
```

If it fails, run `pnpm sync:docs` to regenerate the marked blocks in the root `README.md` (badges/versions, workspace packages, root scripts, Edge Functions, env vars). If the generator asks for a missing description, add the one-line description to the maps in `scripts/sync-docs.mjs` and re-run. Never edit the generated blocks by hand.

**5.2. Prose check.** Compare all commits on the branch against main and look for changes the generator cannot see:

- New or changed **environment variables** (`.env.example`, `import.meta.env`, `process.env`)
- New or changed **scripts** in any `package.json`
- New major **dependencies** added or removed
- New **features**, **packages**, **Edge Functions**, **migrations of note**, or **top-level directories**
- Changes to **build/deployment** config, **quality gates**, or the **testing strategy** (TESTING.md)
- Changes to the **security model** (SECURITY.md)

If any of these are detected, invoke `/technical-writer` to update the prose sections of the affected READMEs (root `README.md` and the per-workspace READMEs in `apps/web`, `packages/*`, `e2e`, `supabase`) before continuing.

**5.3. Reference documents audit (MANDATORY, delegated to a subagent).** The project's reference documents must never lag behind the code. Launch a **general-purpose subagent** (Agent tool) with this brief:

> Run `git diff main...HEAD` and audit it against the project's reference documents:
>
> - `CLAUDE.md` (project rules): commands added/renamed/removed, new packages or import boundaries, new process gates or quality checks
> - `SECURITY.md` (security model): new or changed RLS policies or helper functions, Edge Function guards, roles, activation flow, admin surface, activity logging, deletion behavior
> - `TESTING.md` (testing strategy): new suites, thresholds, gates, or a change in what a layer covers
> - Per-workspace READMEs (`apps/web`, `packages/*`, `e2e`, `supabase`): prose describing structure or behavior the diff changes
>
> Update ONLY statements the diff makes false, incomplete, or missing. Do not restyle, do not rewrite unchanged sections, do not add speculative content. All documentation in English (CLAUDE.md rule). Return the list of files modified with a one-line reason each, or "nothing stale" if no document needed a change.

Review the subagent's edits before committing them (`docs:` type, e.g. `docs: reflect new activation guard in SECURITY.md`). If it returns "nothing stale", move on.

Documentation commit(s) use the `docs` type (e.g., `docs: update README for new env vars`).

Steps 5.1 and 5.3 always run. Step 5.2 may be skipped only when `pnpm check:docs` passes and none of its prose triggers apply.

### 5b. Check Legal Pages (if needed)

If the PR introduces changes that affect legal obligations, check whether the legal pages (`apps/web/src/features/legal/content.ts`, rendered by `LegalPage.tsx`) need updating. Look for:

- New **third-party services** or SDKs added (e.g., analytics, crash reporting, payment providers)
- Changes to **data collection** (new personal data fields, new tracking events)
- Changes to **authentication** flow or required user information
- New **cookie** or local storage usage
- Changes to **data retention** or deletion behavior (soft delete, 30-day bin, account erasure)
- Changes to the **hosting infrastructure** (new providers)
- Addition of **paid features** or subscription model

If any of these are detected, update the relevant sections of the legal content (user-facing copy stays in French) and its last-updated date. The commit uses `chore(web): update legal pages`.

If none of the above apply, skip this step.

### 6. Push Branch

Push the branch to remote with tracking:

```bash
git push -u origin <branch-name>
```

### 7. Create Pull Request

**CRITICAL: The PR body follows `.github/pull_request_template.md`. Read that file and fill it; the skill embeds no copy, so the template file is the only source of structure.**

1. Read `.github/pull_request_template.md`.
2. Fill every section, keeping the template's headings: Summary (what and
   why, link related issues), Scope (check the applicable boxes), Changes,
   How to test. Use "None" or "N/A" when a section does not apply.
3. Checklist: check a box only after verifying that item on this branch.
   When one does not hold, leave it unchecked and explain below the list.
   Every box starts unchecked; checking it is a deliberate act.
4. Create the PR passing the filled body inline:

```bash
gh pr create --title "<type(scope): description>" --body "$(cat <<'EOF'
<the filled template>
EOF
)"
```

The PR description MUST be written in **English**.

### 8. Update PR Details

After creation:

- Ensure title is concise and descriptive
- Fill all template sections appropriately
- Add relevant labels if applicable
- Request reviewers if needed

## PR Title Guidelines

- Keep under 70 characters
- Use imperative mood ("Add feature" not "Added feature")
- Be specific about what changes
- Include scope if helpful

Good: `feat(web): add dossier activation screen`
Bad: `Updated some dossier stuff`

## Checklist Before PR

- [ ] Changes are split into multiple scoped commits (not one big commit)
- [ ] All commits follow conventional format
- [ ] No `--no-verify` was used
- [ ] `pnpm verify` passes
- [ ] The four anti-regression guards ran clean on the final diff (step 4b)
- [ ] `pnpm check:docs` passes (generated README blocks in sync)
- [ ] README prose updated if env vars, scripts, deps, or structure changed (via `/technical-writer`)
- [ ] CLAUDE.md / SECURITY.md / TESTING.md audited against the diff by the subagent (step 5.3)
- [ ] Legal pages updated if new third-party services, data collection, or hosting changes
- [ ] Branch name follows conventions
- [ ] PR description is complete
- [ ] No sensitive data in commits

## Returns

- **pr_url**: The URL of the created pull request
- **branch**: The name of the feature branch
- **commits**: List of commits included in the PR
