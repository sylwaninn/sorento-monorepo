# Testing

How this repository is tested, and, more usefully, how the suites are kept honest as the app
changes. The rule behind everything below: **a test is evidence only if it can still fail.**

## The problem this is built against

Coverage used to sit at 99% on the two pure packages and 11% on the app, which is the inverse of
where the risk is. The declarative layer, Zod schemas that break loudly on their own, was the most
tested; the assembly layer, which had already shipped a crash to a browser, was the least. Nothing
tested the thirteen Edge Functions running as `service_role`, nothing compared the TypeScript
copies of SQL rules against the SQL, and no test drove a single journey end to end.

Every defect below was found by a suite the moment it was written, and was invisible to every test
that existed at the time.

| Defect                                                                                                                                                                  | Found by                       |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------ |
| `emailStatusSchema` never gained `"failed"` after the migration allowed it: one exhausted send made a user's whole notification list unreadable                         | SQL-to-TypeScript mirror suite |
| `InvitationRepository.resolve` posted the token in the body while the function read it from the query string, so **every** invitation resolved as "invalide ou expirée" | E2E journey                    |
| The origin pinned by `_shared/http.ts` is replaced with `*` by the Supabase gateway, so CORS is not a boundary anything may rely on                                     | Edge Function HTTP suite       |
| `weekly-digest` inserted its notification unconditionally, so any duplicate tick sent the same digest twice                                                             | Scheduled job suite            |
| An invited relative whose link had expired was shown `Supabase call failed: accept invitation`, in English                                                              | AcceptInvitationPage test      |
| A reminder about two waiting procedures read "2 démarche en attentes"                                                                                                   | Email body suite               |

## The layers

Ordered by how close they run to production. Each answers a question the ones above it cannot.

The journeys cover every screen the route table declares, driven the way a person drives them.

| Layer             | Where                                            | Runs with               | Answers                                               |
| ----------------- | ------------------------------------------------ | ----------------------- | ----------------------------------------------------- |
| Unit, rules       | `packages/core`                                  | `pnpm test`             | does the rule compute the right thing?                |
| Unit, contracts   | `packages/domain`                                | `pnpm test`             | does the schema refuse what it must?                  |
| Unit, translation | `packages/supabase-client/src/mappers`           | `pnpm test`             | does a row become the right domain object?            |
| Unit, Edge shared | `supabase/functions/_shared`                     | `pnpm test:functions`   | does the guard decide, and the email escape?          |
| Component         | `apps/web/src/**/*.test.tsx`                     | `pnpm test`             | does the screen show and do the right thing?          |
| Smoke             | `apps/web/src/routes.test.tsx`                   | `pnpm test`             | can every screen mount at all?                        |
| Integration, RLS  | `packages/supabase-client/src/integration-tests` | `pnpm test:integration` | does the database refuse the right people?            |
| Integration, Edge | same                                             | `pnpm test:integration` | is the guard actually wired into the endpoint?        |
| Integration, jobs | same                                             | `pnpm test:integration` | does the scheduled job act once, on the right people? |
| Journey           | `e2e/tests`                                      | `pnpm test:e2e`         | does the whole thing work for a person?               |

### What each layer deliberately does not do

- **core / domain** hold no I/O and no clock. The clock is injected, which is what makes 100%
  coverage and a 95+ mutation score reachable without heroics.
- **Mappers** are measured; **repositories are not.** A repository is a query builder whose whole
  behaviour is what Postgres does with it, and a unit test against a mock of the fluent API passes
  just as happily when a policy denies the read. They are covered by the integration suites,
  against a real database.
- **The route smoke suite** stubs the entire data layer with promises that never settle, so every
  screen renders its loading branch. It proves a screen can mount: imports resolve, hooks run in a
  stable order, providers are present. It does not check loaded-state behaviour; that belongs to
  the screen's own test, and the real round trip belongs to a journey. Around fifteen screens are
  still covered by this and nothing else, which is why the app's coverage percentage is worth
  reading per file rather than in aggregate.
- **The Edge Function HTTP suite** asks one question of every endpoint: what do you do for someone
  who is nobody? Refusal, and the shape of it. What each handler does once past its guard belongs
  to the job suite and to the journeys.
- **The job suite** asserts the rows a scheduled job leaves behind, never a message leaving the
  machine: the local stack has no provider key, so a send is observable only as delivery
  bookkeeping.
- **Journeys** are a black box. They import none of the app's packages and speak HTTP to the
  running stack, so a bug shared with the app cannot hide itself. They also open the mailbox:
  signing up, resetting a password and asking for a magic link all end with a person leaving the
  browser, and a journey stopping at "the screen said an email was sent" proves the screen rather
  than the flow.

### A journey that records a defect instead of hiding it

Five journeys are marked `test.fail()`. Each asserts what a person is entitled to expect, meets a
real defect, and says so in a comment naming why the fix is a separate change: French email
templates, re-evaluating a journey after its answers are corrected, guides that were never
written, and the missing `main` landmark.

The marker is not a `skip`. Playwright fails the run the moment one of them starts passing, so the
annotation cannot outlive the defect it records, and the assertion is never weakened to match what
the code happens to do.

## Keeping the suites honest

Seven mechanisms, because "write good tests" is not a mechanism.

### 1. Structural audit, `pnpm check:tests`

Runs no test; compares the file tree against itself in milliseconds, which is why it sits in the
pre-commit hook. It refuses:

- **an orphan test**, a `Foo.test.ts` whose subject was deleted. It keeps passing forever and
  reads as evidence. Themed suites with no single subject are listed explicitly in the script, so
  adding one is a visible decision.
- **an untested module**, anything in `core`, `domain`, the mappers or `_shared` without a sibling
  test. A rule shipped without one raises coverage nowhere, so no threshold catches it.
- **an Edge Function the HTTP suite's own table does not name, with the guard it uses.** Matching
  the name anywhere in the file would let a mention in a comment stand in for a case.
- **a table entry naming a function that no longer exists**, which is a case asserting nothing.
- **a guard the deployment disagrees with.** The guard is stated twice: as a tag in that table, and
  as `verify_jwt` in `supabase/config.toml`, which is what the gateway enforces. They fail in
  opposite directions. Tested as jwt-guarded and deployed with `verify_jwt = false` is a guard
  nobody enforces; tested as token-guarded and deployed with `verify_jwt = true` is an endpoint
  unreachable by the anonymous caller its design assumes, whose refusal tests keep passing because
  the gateway is the one refusing.
- **a French string a journey clicks on that its dictionary no longer contains.** See below.
- **a masked lookup.** `content.questions["mode"]?.title ?? ""` keeps passing after `mode` is
  removed: the assertion compares the empty string against itself. Tests read through `must(...)`,
  which throws.
- **`.only` and `.skip`**: one silently skips the rest of a file, the other is a test that does
  not exist.

### 2. Coverage thresholds, as a ratchet

Each package states its own. A single monorepo-wide number would be meaningless across layers
whose risk differs by an order of magnitude. They may go up, never down. Lowering one to make CI
pass is the change under review, not a fix.

`pnpm coverage:ratchet:check` fails when a package achieves more than 5 points above its
threshold: slack is where a regression hides. `pnpm coverage:ratchet` raises them.

### 3. Coverage of the changed lines, `pnpm coverage:diff`

A global percentage barely moves when a hundred untested lines land in a large repository, so the
gate meant to mean "changes arrive with tests" stays green through exactly the change it exists to
catch. This asks the narrower question: of the lines this branch touched, how many does a test
execute? Runs on pull requests, from the lcov the coverage run already produced.

That now includes `supabase/functions/_shared`, whose lcov comes from `deno test`. It was excluded
along with the rest of `supabase/`, which made the code with the most authority in the repository,
running as `service_role` on every request, the one layer whose changed lines no gate looked at.
The handlers stay out: they are exercised by the HTTP suite, in the Edge runtime, which reports no
coverage from there.

### 4. Mutation score, `pnpm test:mutation`

Coverage says a line ran. The mutation score says an assertion would have caught it changing.
Applied to `core` and `domain` only: they are pure, so the run takes seconds, and line coverage on
a declarative package is cheap to fake, since importing a module executes its `z.object(...)`
calls without asserting anything.

### 5. Snapshots of what the database ended up with

`rls-policies.txt` records every RLS policy, read back from the live catalog after all migrations
replay. A migration that drops and recreates a policy with a looser `USING` clause is a two-line
diff nobody re-reads; here it is a diff that has to be accepted deliberately, and that is the
moment to write the test for the new behaviour. The same suite refuses a public table with RLS
off, a protected table with no policy, and a `security definer` function that does not pin its
`search_path`.

Update with `pnpm test:integration -u` after reviewing the diff. Never to make CI green.

A snapshot records what a policy says. It cannot say who a policy lets in, which is why every
table it covers also has behavioural tests, written from expected usage: "a viewer cannot remove
a document someone else added", never a restatement of the `USING` clause.

### 6. Suites that survive being shuffled

A test consuming state a previous test produced passes only because vitest runs in declaration
order, and breaks under `.only`, a shuffle, or a single-test retry. The integration suites are run
under `--sequence.shuffle.tests` with several seeds; each test builds its own precondition.

Assertions do not live in `beforeAll`. A security assertion there is worse than useless: a refusal
the fixture expected is reported as a broken hook, in a place no reader looks for a policy test.
Fixtures throw loudly through `must(...)`; the permission itself is asserted in a test of its own,
against `42501` specifically, so a check constraint cannot stand in for a policy.

### 7. The journeys' French copy, compared against the app

The E2E suite is a black box: it imports none of the app's packages, so every string it clicks on
is a copy of a content dictionary rather than a reference to one. Left uncompared, that copy
drifts, and it surfaces as the worst failure a suite can produce: a selector finding nothing,
minutes into CI, pointing at the test rather than at the wording that moved.

Every string is declared through `mirrors(...)`, which names the dictionary it came from, and
`check:tests` reads every such call under `e2e/` and refuses one whose dictionary no longer
contains that text. A rewording then fails in milliseconds, before the commit, naming both sides.

`e2e/support/copy.ts` holds what the shared helpers drive the app through; copy belonging to one
area lives beside that area's journey, in its own `copy-<area>.ts`, so two journeys never queue
behind the same file.

Inside the app the same problem is solved by the compiler: a test asserts on `authContent.login.
submitButtonPassword`, never on the sentence, so a renamed key does not build and a removed one
fails by name through `must(...)`.

### 8. What the page actually looks like

Three assertions in `public-quality.e2e.ts` cover what no other layer can see, because jsdom
lays nothing out and a component test renders a tree rather than a page: axe over each public
route, a screenshot per viewport, and the painted pixels of every image.

The pixel sampling is not redundant with the screenshot. `complete`, `naturalWidth` and even
`decode()` all answered yes for a hero photograph that rendered as nothing, its AVIF variants
written by an encoder Chromium decodes to a fully transparent surface; the page shipped its main
photograph invisible on every viewport wide enough to choose those variants. It is asserted per
viewport because srcset is what picks the file, so a variant chosen only on a wide screen is a
variant no narrow run ever looks at.

A baseline is regenerated in the commit that changes the design, and the same goes for a numeric
budget a journey asserts, a maximum button width for instance. Neither is a test failing: it is
the design change arriving without the half of itself that records what it decided. Left behind,
they turn the suite red for a known reason, which is how the next real regression goes unread.

## Where TypeScript and SQL both state a rule

Whichever side is not the authority is a copy, and a copy that nothing compares is a copy that
drifts. `sql-mirrors.integration.test.ts` reads the **live catalog**, not a copy of the migration,
because a constraint dropped and recreated later is only knowable from the database, and compares:

- every Zod enum against its `check (col in (...))` constraint;
- `DEFAULT_NOTIFICATION_PREFERENCES` against `resolve_notification_preference()`, per type.

One documented exception: `invitation`. `invite-member` sends its email itself without consulting
preferences, so the SQL function has no branch for it. The exception is asserted as such, which
keeps it from quietly becoming two.

The same reasoning removed two other copies rather than comparing them. The journeys used to
restate the 48-hour grace period and the columns `request-dossier-activation` writes; they now
plant the token on the designation and spend it against the endpoint, so the function decides.
Email bodies used to be assembled inside `send-pending-emails`, where nothing could read them
back and three escaping fixes shipped without a test changing; they are pure builders in
`_shared/emails.ts` now, with the escaping asserted per interpolation site.

## Running things

```bash
pnpm verify              # the full local gate, what pre-push runs
pnpm test                # unit tests, every package
pnpm test:coverage       # unit tests + thresholds
pnpm test:functions      # Edge Function shared code (deno test), and its lcov
pnpm check:tests         # structural audit of the suites
pnpm coverage:diff       # coverage of the lines this branch changed
pnpm coverage:ratchet    # raise thresholds to what is achieved

supabase start           # required by everything below
pnpm test:integration    # RLS, policy snapshot, SQL mirrors, Edge Functions, scheduled jobs
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
  for what it does, not for the fact that it renders. Assert copy by reading it from the feature's
  `content.ts`, never by retyping the sentence.
- **A repository method**: cover it in the integration suite, against the real policies.
- **A table or a policy**: the policy snapshot changes; review the diff, then write the
  behavioural test that says who the new access lets in and who it still refuses.
- **An Edge Function**: add it to the table in `edge-functions.integration.test.ts` with the guard
  it uses, and declare it in `config.toml` with the matching `verify_jwt`. `check:tests` refuses
  all three of a missing case, a stale one, and a disagreement.
- **A scheduled job**: assert what it leaves behind, and assert that running it twice leaves the
  same thing. A job is invoked by a machine that can invoke it twice.
- **An email**: the body is a builder in `_shared/emails.ts`, and every value a user typed goes
  through `escapeHtml`. Interpolating inside a function body is untestable by construction, which
  is how three escaping holes were fixed without a test noticing.
- **A rule stated in both SQL and TypeScript**: add the pair to the mirror suite. Do not write the
  same list twice and hope.
- **Copy an E2E journey clicks on**: declare it with `mirrors(...)`, naming its dictionary, in
  `e2e/support/copy.ts` if the shared helpers use it and in the area's own `copy-<area>.ts`
  otherwise.
- **A photograph**: add every width to the feature's presentation catalog, render it through
  `OptimizedPicture`, and regenerate the screenshot baselines. The painted-pixel assertion covers
  it automatically; nothing else will notice an image that loads and paints nothing.
