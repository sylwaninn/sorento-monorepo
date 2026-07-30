# @sorento/web

React SPA: the **assembly layer** of the monorepo. It composes `@sorento/domain`, `@sorento/core` and `@sorento/supabase-client` into screens. A React component here never contains a business rule: no eligibility condition, no deadline computation. Those live in `packages/core`, and the ESLint boundaries fail the build if this layer reaches where it should not.

## Stack

React 19 · Vite · React Router 7 · TanStack Query 5 · shadcn/ui on Radix · Tailwind CSS v4, driven entirely by the tokens in `src/index.css`.

## Structure

```
src/
├── auth/          # Session handling and guards
├── components/    # Shared presentational components, with ui/ holding the shadcn registry
├── features/      # One directory per feature: account, activation, admin, auth,
│                  # content, diagnostic, dossier(s), landing, legal, notifications
├── hooks/         # Shared hooks
├── layout/        # App shell
├── lib/           # Framework glue (query client, supabase wiring, helpers)
├── index.css      # The only authored stylesheet: @theme tokens and the base layer
├── navigation.ts  # Public URLs and homepage anchors
└── routes.tsx     # Route table
```

`components/ui/` is the shadcn registry, added through its CLI and kept close to upstream: the
theme is what makes it ours. Where a component gained an API the whole app needs (a `pending`
button, an `asChild` card title, an alert that derives its own icon), the reason sits in a
comment beside it.

A feature that grows past a screen splits the same way the homepage does: `sections/` for the
bands of the page, `components/` for the pieces they share, `content/` for one copy module per
section, and `presentation.ts` for the visuals keyed by content id. Nothing in `components/`
imports a feature; a shared component that needs feature data takes it as a prop.

## Images

Every photograph ships as an AVIF and a JPEG at each width in `public/images/`, listed in the
feature's `presentation.ts` and served through `OptimizedPicture`. The hero is preloaded from
`index.html`, whose two candidate lists are compared against that catalog by
`features/landing/presentation.test.ts`: a preload that selects a different candidate downloads
the largest asset on the page twice.

Encode the AVIF variants with libaom (`sharp`, `avifenc`), never with macOS `sips`. Its output
carries the right dimensions and satisfies `complete`, `naturalWidth` and even `decode()`, and
Chromium then paints it as a fully transparent surface. The homepage shipped its hero invisible
on every viewport above 768px that way.

## Rules that bite here

- **shadcn/ui components only.** Composing them is encouraged; reimplementing one is forbidden. Check every prop against the shadcn docs (MCP) and add components with the CLI, never by hand. A hand-drawn equivalent of something the registry ships (a dialog, a disclosure) is the bug, even when it looks right.
- **UI copy is French, code is English**: identifiers, files, comments, all of it.
- **Tone**: cautious wording about entitlements, referral to regulated professionals on inheritance screens, never guilt-inducing UI (no aggressive red, no overdue counters, at most 2-3 highlighted "to do now" items).
- **Catalog data** renders with `source_url`, `last_verified_date` and `caution_text` as non-optional props.
- Only `VITE_`-prefixed environment variables reach the browser. The `service_role` key never appears here, under any name.

## Commands

```bash
pnpm --filter @sorento/web dev       # Vite dev server
pnpm --filter @sorento/web build     # production build
pnpm --filter @sorento/web test      # unit tests (Vitest + Testing Library, jsdom)
```

Root-level `pnpm dev` / `pnpm verify` cover this package through Turborepo.
