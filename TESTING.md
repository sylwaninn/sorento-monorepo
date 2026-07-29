# Testing

How this repository is tested, and, more usefully, how the suites are kept honest as the app
changes. The rule behind everything below: **a test is evidence only if it can still fail.**

## The problem this is built against

Coverage used to sit at 99% on the two pure packages and 11% on the app, which is the inverse of
where the risk is. The declarative layer (Zod schemas that break loudly on their own) was the
most tested; the assembly layer, which had already shipped a crash to a browser, was the least.
Nothing tested the thirteen Edge Functions running as `service_role`, nothing compared the
TypeScript copies of SQL rules against the SQL, and no test drove a single journey end to end.

Three real defects were found the moment those gaps were closed, all invisible to every test that
existed at the time:

| Defect                                                                                                                                                               | Found by                       |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------ |
| `emailStatusSchema` never gained `"failed"` after the migration allowed it; one exhausted send made a user's whole notification list unreadable                      | SQL-to-TypeScript mirror suite |
| `InvitationRepository.resolve` posted the token in the body while the function read it from the query string; **every** invitation resolved as "invalide ou expirée" | E2E journey                    |
| The origin pinned by `_shared/http.ts` is replaced with `*` by the Supabase gateway, so CORS is not a boundary anything may rely on                                  | Edge Function HTTP suite       |

## The layers

Ordered by how close they run to production. Each answers a question the ones above it cannot.

| Layer              | Where                                            | Runs with               | Answers                                        |
| ------------------ | ------------------------------------------------ | ----------------------- | ---------------------------------------------- |
| Unit (rules)       | `packages/core`                                  | `pnpm test`             | does the rule compute the right thing?         |
| Unit (contracts)   | `packages/domain`                                | `pnpm test`             | does the schema refuse what it must?           |
| Unit (translation) | `packages/supabase-client/src/mappers`           | `pnpm test`             | does a row become the right domain object?     |
| Unit (Edge shared) | `supabase/functions/_shared`                     | `pnpm test:functions`   | does the guard decide correctly?               |
| Component          | `apps/web/src/**/*.test.tsx`                     | `pnpm test`             | does the screen show and do the right thing?   |
| Smoke              | `apps/web/src/routes.test.tsx`                   | `pnpm test`             | can every screen mount at all?                 |
| Integration (RLS)  | `packages/supabase-client/src/integration-tests` | `pnpm test:integration` | does the database refuse the right people?     |
| Integration (Edge) | same                                             | `pnpm test:integration` | is the guard actually wired into the endpoint? |
| Journey            | `e2e/tests`                                      | `pnpm test:e2e`         | does the whole thing work for a person?        |

### What each layer deliberately does not do

- **core / domain** hold no I/O and no clock. The clock is injected, which is what makes 100%
  coverage and a 95+ mutation score reachable without heroics.
- **Mappers** are measured; **repositories are not.** A repository is a query builder whose whole
  behaviour is what Postgres does with it, and a unit test against a mock of the fluent API passes
  just as happily when a policy denies the read. They are covered by the integration suites,
  against a real database.
- **The route smoke suite** stubs the entire data layer with promises that never settle, so every
  screen renders its loading branch. It proves a screen can mount: imports resolve, hooks run in
  a stable order, providers are present. It does not check loaded-state behaviour; that belongs to
  the screen's own test, and the real round trip belongs to a journey.
- **Journeys** are a black box. They import none of the app's packages and speak HTTP to the
  running stack, so a bug shared with the app cannot hide itself.

## Keeping the suites honest

Five mechanisms, because "write good tests" is not a mechanism.

### 1. Structural audit: `pnpm check:tests`

Runs no test; compares the file tree against itself in milliseconds, which is why it sits in the
pre-commit hook. It refuses:

- **an orphan test**: a `Foo.test.ts` whose subject was deleted. It keeps passing forever and
  reads as evidence. Themed suites with no single subject are listed explicitly in the script, so
  adding one is a visible decision.
- **an untested module**: anything in `core`, `domain`, the mappers or `_shared` without a
  sibling test. A rule shipped without one raises coverage nowhere, so no threshold catches it.
- **an Edge Function no test names**: thirteen functions run as `service_role`; a new one must be
  named by the HTTP suite.
- **a masked lookup**: `content.questions["mode"]?.title ?? ""` keeps passing after `mode` is
  removed: the assertion compares the empty string against itself. Tests read through `must(...)`,
  which throws.
- **`.only` and `.skip`**: one silently skips the rest of a file, the other is a test that does
  not exist.

### 2. Coverage thresholds, as a ratchet

Each package states its own: a single monorepo-wide number would be meaningless across layers
whose risk differs by an order of magnitude. They may go up, never down. Lowering one to make CI
pass is the change under review, not a fix.

`pnpm coverage:ratchet:check` fails when a package achieves more than 5 points above its
threshold: slack is where a regression hides. `pnpm coverage:ratchet` raises them.

### 3. Coverage of the changed lines: `pnpm coverage:diff`

A global percentage barely moves when a hundred untested lines land in a large repository, so the
gate meant to mean "changes arrive with tests" stays green through exactly the change it exists to
catch. This asks the narrower question: of the lines this branch touched, how many does a test
execute? Runs on pull requests, from the lcov the coverage run already produced.

### 4. Mutation score: `pnpm test:mutation`

Coverage says a line ran. The mutation score says an assertion would have caught it changing.
Applied to `core` and `domain` only: they are pure, so the run takes seconds, and line coverage on
a declarative package is cheap to fake: importing a module executes its `z.object(...)` calls
without asserting anything.

### 5. Snapshots of what the database ended up with

`rls-policies.txt` records every RLS policy, read back from the live catalog after all migrations
replay. A migration that drops and recreates a policy with a looser `USING` clause is a two-line
diff nobody re-reads; here it is a diff that has to be accepted deliberately, and that is the
moment to write the test for the new behaviour. The same suite refuses a public table with RLS
off, a protected table with no policy, and a `security definer` function that does not pin its
`search_path`.

Update with `pnpm test:integration -u` after reviewing the diff. Never to make CI green.

## Where TypeScript and SQL both state a rule

Whichever side is not the authority is a copy, and a copy that nothing compares is a copy that
drifts. `sql-mirrors.integration.test.ts` reads the **live catalog** (not a copy of the migration,
because a constraint dropped and recreated later is only knowable from the database) and compares:

- every Zod enum against its `check (col in (...))` constraint;
- `DEFAULT_NOTIFICATION_PREFERENCES` against `resolve_notification_preference()`, per type.

One documented exception: `invitation`. `invite-member` sends its email itself without consulting
preferences, so the SQL function has no branch for it. The exception is asserted as such, which
keeps it from quietly becoming two.

## Running things

```bash
pnpm verify              # the full local gate: what pre-push runs
pnpm test                # unit tests, every package
pnpm test:coverage       # unit tests + thresholds
pnpm test:functions      # Edge Function shared code (deno test)
pnpm check:tests         # structural audit of the suites
pnpm coverage:diff       # coverage of the lines this branch changed
pnpm coverage:ratchet    # raise thresholds to what is achieved

supabase start           # required by everything below
pnpm test:integration    # RLS, policy snapshot, SQL mirrors, Edge Functions over HTTP
pnpm test:e2e            # journeys, against a production build of the app
```

`pnpm test:e2e` builds the app and serves it with `vite preview`. That is deliberate: a journey
that only works with hot reload and unminified React is not the journey users get. The consequence
is that Vite strips the development-only signup shortcut from the bundle, so the journeys create
their confirmed accounts through the admin API and sign in through the real login screen.

### The two gates

**pre-commit**: gitleaks, lint-staged, `check:tests`, typecheck. Everything here is fast enough
that nobody reaches for `--no-verify`.

**pre-push**: `pnpm verify`. Paid once per push. The suites needing a running stack are not in it:
they need `supabase start` and a built app, so they belong to CI and to a deliberate local run.

**CI** adds what a machine can afford: the integration suites and the journeys against a stack
started from nothing, mutation testing, a build, and a secret scan.

## Adding to the app

- **A rule in `core` or a schema in `domain`**: the sibling test is required; `check:tests`
  refuses the commit otherwise. Mutation testing will find an assertion that does not assert.
- **A screen**: adding its route to `routes.tsx` smoke-tests it automatically. Write its own test
  for what it does, not for the fact that it renders.
- **A repository method**: cover it in the integration suite, against the real policies.
- **A table or a policy**: the policy snapshot changes; review the diff and write the test that
  covers the new access before accepting it.
- **An Edge Function**: add it to the table in `edge-functions.integration.test.ts` with the guard
  it uses. `check:tests` refuses a function no test names.
- **A rule stated in both SQL and TypeScript**: add the pair to the mirror suite. Do not write the
  same list twice and hope.
