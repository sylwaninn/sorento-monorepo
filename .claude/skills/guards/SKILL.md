---
name: guards
description: Run the four anti-regression guard agents (security, code practices, design system, tests) in parallel on the pending changes and merge their findings into one report
allowed-tools: Agent, Bash(git:*), Bash(pnpm:*), Read, Grep, Glob
argument-hint: [base-ref]
---

# Anti-regression guards

Run the four guard agents on the pending changes, concurrently, then
merge their reports into a single ordered list.

## Current State

- Current branch: !`git rev-parse --abbrev-ref HEAD`
- Git status: !`git status --short`
- Diff summary: !`git diff --stat origin/main...HEAD`

## Arguments

- `$ARGUMENTS[0]`: base ref to diff against (optional, defaults to
  `origin/main`, falling back to `main` when the remote ref is absent).

## Workflow

### 1. Establish the change set

Committed work (`git diff <base>...HEAD`), uncommitted work
(`git diff HEAD`), and untracked files (`git status --porcelain`). If
there is nothing to review at all, say so and stop.

### 2. Launch the four guards in parallel

A single message with four Agent calls, so they run concurrently:

- `security-regression-guard`
- `code-practices-guard`
- `design-system-guard`
- `test-regression-guard`

Give each the same brief: the exact base ref, whether uncommitted and
untracked work is included, and any focus the user asked for. Do not
summarize the diff for them; they read it themselves.

### 3. Merge the reports

- Deduplicate findings that two guards raised on the same `file:line`
  (keep the highest severity, mention both angles).
- Order: critical, then high, then medium, then low; group by file
  inside a severity.
- Keep each finding one line plus its fix, with `file:line`.

### 4. Report, do not fix

This skill reports; fixing is a separate decision. End with either:

- the merged findings list, worst first, or
- "all four guards clean", plus one line per guard on what it checked.

## Returns

- **findings**: merged, severity-ordered list (possibly empty)
- **guards_run**: the four guard names with a clean/dirty flag each
