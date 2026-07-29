# @sorento/domain

**Zod schemas and the types inferred from them**, the single source of truth for every domain shape: dossier, membership roles, procedures, answers, notifications, and the rest.

Rules:

- Types come from `z.infer`, never hand-duplicated interfaces. If a shape exists, its schema is here and everything else derives from it.
- The only runtime dependency is `zod`. No React, no Supabase, no I/O.
- Domain vocabulary is English in code (`procedure`, not `demarche`; `dossier` stays `dossier`, a valid English word). French only appears in user-facing copy, which does not live here.

Consumed by every other workspace: `core`, `supabase-client`, `apps/web`, and the Edge Functions (through the generated Deno import map; adding a module here requires `pnpm sync:functions-imports`).

## Testing

Every schema module has a sibling `*.test.ts` (enforced by `pnpm check:tests`), coverage is ratcheted, and the package is mutation-tested with Stryker.

```bash
pnpm --filter @sorento/domain test
pnpm --filter @sorento/domain test:mutation
```
