# @sorento/core

**Pure business logic.** The rules engine that turns a dossier's answers into a personalised journey — procedures, ordering, deadlines, possible benefits, letter templates — plus the permission matrix and every other business rule of the product.

Pure means enforced-pure: zero React imports, zero Supabase imports, zero I/O, and time arrives through an injected clock. The ESLint boundaries and `pnpm check:tests` keep it that way.

## What lives here

- The journey engine: which procedures apply, in which order, with which deadlines.
- `permissions.ts`: the role/permission matrix. It mirrors the RLS policies — the interface hides, RLS forbids — and any divergence between the two is a blocking bug (see [SECURITY.md](../../SECURITY.md)).
- Deadline and date computations (injected clock, so every rule is testable at any date).

## Testing bar

The strictest in the repo, because this is where the rules live:

- Every module has a sibling `*.test.ts` — `pnpm check:tests` refuses one without.
- Coverage thresholds are ratcheted (up, never down).
- **Mutation-tested** with Stryker (`pnpm test:mutation`): coverage proves a line ran, the mutation score proves an assertion would notice it changing.

## Commands

```bash
pnpm --filter @sorento/core test            # unit tests
pnpm --filter @sorento/core test:mutation   # Stryker
```

Depends only on `@sorento/domain`. Consumed by `apps/web` and the Edge Functions (through the generated Deno import map).
