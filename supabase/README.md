# supabase/

The database, its policies, and the Deno Edge Functions.

## Migrations

The schema changes **exclusively** through versioned SQL in `migrations/`, never through the dashboard.

- `supabase migration new <name>` creates one; `supabase db reset` replays them all plus `seed.sql`.
- RLS is enabled and its policies written **in the same migration** that creates a table. A table without a policy is unreachable, and that is the intended default.
- Every new policy arrives with its integration test (`packages/supabase-client/src/integration-tests/`), and the policy snapshot test turns any policy change into a deliberate, reviewed diff.

## Edge Functions

One directory per function; the full list with descriptions is generated into the [root README](../README.md#supabase). Shared code (env guard, cron auth, HTTP helpers, schemas, and the notification email bodies) lives in `_shared/`, covered by `pnpm test:functions`, whose lcov also feeds the changed-lines coverage gate.

- `deno.json` (the import map letting functions share `@sorento/domain` and `@sorento/core`) is **generated**: run `pnpm sync:functions-imports` after adding a module to those packages; CI fails if it drifts.
- Every function is declared in `config.toml` with the `verify_jwt` matching the guard the Edge Function suite tests it under. `pnpm check:tests` refuses a function the suite's table does not name, a table entry pointing at a deleted function, and a `verify_jwt` that disagrees with the tested guard: the gateway is what actually enforces the guard, so the two saying different things means one of them is wrong about who may reach the endpoint.
- Cron-invoked functions (`daily-reminders`, `send-pending-emails`, `process-dossier-activations`, `weekly-digest`) are protected by `CRON_SECRET`, mirrored in Vault; they must never be publicly callable. A machine can invoke them twice, so a second tick must leave what the first one left: `daily-reminders` caps one notification per recipient per dossier per day and `weekly-digest` one per week, checked before the summary is computed.
- Development-only endpoints (`dev-signup`) are guarded by `env.isDevelopment` (`_shared/env.ts`), checked **before reading the request body**, and answer 404 outside development. The model is detailed in [SECURITY.md](../SECURITY.md).

## Local stack

```bash
supabase start        # Postgres, Auth, Storage, Edge runtime (Docker)
supabase db reset     # replay migrations + seed
pnpm check:functions  # Deno lint + typecheck + import-map guard
pnpm test:functions   # tests for _shared/
```

`snippets/` holds ad-hoc SQL kept for reference; nothing in it is part of the schema.
