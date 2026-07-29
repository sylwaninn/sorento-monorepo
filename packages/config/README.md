# @sorento/config

Shared tooling presets. Every workspace consumes these instead of owning its own configuration, so the bar is identical everywhere.

## Exports

| Export                                | Contents                                                                                                                                                                                                                |
| ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@sorento/config/eslint-base`         | Base ESLint flat config (strict TypeScript, arrow-functions-only, Prettier)                                                                                                                                             |
| `@sorento/config/eslint-boundaries`   | The import-boundary law: `domain → ∅`, `core → domain`, `supabase-client → domain`, `app → everything`, nothing imports from `apps/*`, only `supabase-client` imports `@supabase/supabase-js`, absolute specifiers only |
| `@sorento/config/tsconfig-base.json`  | Strict TS base: `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`                                                                                                                                      |
| `@sorento/config/tsconfig-react.json` | React variant of the base                                                                                                                                                                                               |
| `@sorento/config/prettier`            | Prettier config (incl. Tailwind plugin)                                                                                                                                                                                 |
| `@sorento/config/vitest-coverage`     | Shared coverage configuration for the ratcheted thresholds                                                                                                                                                              |

The boundary rules encode the architecture section of the root [README](../../README.md#architecture); changing them is an architecture decision, not a lint tweak.
