# Commit Rules

## Format (MANDATORY)

```
type(scope): description
```

- **ONE LINE ONLY** - Multiline commits are forbidden
- **Types**: feat, fix, docs, style, refactor, test, chore
- **Scope**: Required when the change targets one workspace or area: web,
  core, domain, supabase-client, config, supabase (migrations, Edge
  Functions), e2e, ci, deps. Omit only for genuinely cross-cutting changes.
  Never invent a scope that is not a workspace or area of this repo.
- **Description**: Lowercase, no period, imperative mood
- **Start with a verb**: add, fix, update, remove, configure, refactor, etc. Never a bare noun list

## Examples

```
feat(core): add surviving spouse pension eligibility rule
feat(web): add dossier activation screen
fix(supabase): escape user-supplied text in outbound emails
refactor(domain): extract procedure status schema
test(e2e): cover the trusted contact activation journey
chore(deps): update heroui packages
docs: reflect activation grace period in security model
```

## Branch Naming

| Prefix    | Usage               |
| --------- | ------------------- |
| `feat/`   | New features        |
| `fix/`    | Bug fixes           |
| `chore/`  | Maintenance         |
| `hotfix/` | Production critical |

## Pre-commit Hooks (ABSOLUTE)

- Pre-commit (husky) runs gitleaks, lint-staged (ESLint + Prettier),
  `pnpm check:tests` and typecheck; pre-push runs `pnpm verify`
- **ALL** commits must also pass `pnpm verify` before the task is done
- **NEVER** use `--no-verify`
- **NEVER** bypass hooks for any reason
- If hooks fail → fix the issue, don't skip it

## Attribution

- **NEVER** add `Co-Authored-By` trailers to commits
- All commits must appear as authored solely by the user
- Do not add any attribution lines for Claude or any AI tool

## Commit Content

- One logical change per commit
- Atomic commits that build independently
- No WIP commits on main branch
- Never commit sensitive data (.env, credentials)
