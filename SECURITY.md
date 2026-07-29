# Security

This document describes the service's security model, the choices we own and
their trade-offs. It complements `CLAUDE.md`, which states the rules; here we
explain why they are what they are.

## Authorization model

Authorization lives in the database, not in the interface. Every table has RLS
enabled and an explicit policy; a table without a policy is unreachable, which
is the intended default behaviour.

- `has_dossier_access(dossier_id, min_role)` is the single function every child
  table derives from (`tracking`, `answers`, `documents`, `comments`,
  `contracts`, `activity_log`). It ignores binned dossiers: a soft delete
  really does revoke access, it does not merely hide the row.
- The `trusted_contact` role maps to no minimum at all: the trusted contact
  sees nothing. When the dossier is activated, its membership row is promoted
  to `owner` or `collaborator`, and it is that promotion (not an exception
  inside the function) that opens access.
- The same matrix is transcribed in `packages/core/src/permissions.ts`, tested
  case by case. The interface hides, RLS forbids. **Any divergence between the
  two is a blocking bug**: the test table in `permissions.test.ts` is the
  reference to update first.
- The platform administrator has access neither to dossiers, nor to tracking,
  nor to comments, nor to documents. Their only cross-cutting read is
  `get_admin_metrics()`, which returns aggregate counters only.

## Activity log

The log is written server-side, never client-side: database triggers for status,
assignment, document and answer changes; Edge Functions (`service_role`) for
invitations and activations. The only client-triggerable entry is letter
generation (`log_letter_generation`), because the PDF is produced in the
browser, and that RPC still stamps `actor_id` from `auth.uid()` and re-checks
access to the dossier.

Intended consequence: no client insert policy on `activity_log`. A member can
neither forge an entry in someone else's name, nor omit writing one.

## Application tokens

Invitations and trusted-contact designation do not use Supabase authentication
links. Each token is 32 random bytes, is stored only as a SHA-256 hash, and
exists in the clear only in the link that is sent.

| Token                             | Lifetime             | Usage                                  |
| --------------------------------- | -------------------- | -------------------------------------- |
| Member invitation                 | 14 days              | single use (`used_at`)                 |
| Trusted-contact consent           | 48 h                 | single use (the hash is erased on use) |
| Activation by the trusted contact | 365 days, reissuable | reusable                               |

**The activation token is the only one that is not single use, and that is a
deliberate departure from the general rule.** It is the "in case of death"
link: it may sit unused for years, and making it consumable once would make it
unusable at the precise moment it matters. The trade-offs: it is issued only
after explicit consent, it is sent only to the address that consented, it
expires after a year, it can be revoked by the owner at any time, and above all
**it switches nothing on its own**: it opens a 48 h grace period during which
every member is notified and can object.

Invitation and consent both check that the signed-in account's email address
matches the one on the invitation: a forwarded link lets nobody in.

## Objection and freeze

An objection cancels the activation in progress **and** freezes the dossier
(`activation_frozen_at`). A new attempt is refused until support lifts the
freeze via `release_activation_freeze()`, restricted to the administrator.
This is deliberately a human action: a frozen dossier means two relatives
disagree about whether a person has died.

## Sessions and XSS

Sessions are stored by the Supabase client in `localStorage`.

**The risk is real and known**: an XSS flaw would allow the access token to be
exfiltrated. This choice is accepted for a web V1 because the alternative,
`HttpOnly` cookies, requires an intermediate backend the architecture does not
have, and because the access token is short-lived (1 h) with refresh token
rotation.

Compensating measures in place:

- Strict CSP served with the application (see `apps/web/index.html`): no
  `unsafe-eval`, no third-party script source, `frame-ancestors 'none'`,
  `object-src 'none'`, `base-uri 'self'`, `form-action 'self'`.
- No `dangerouslySetInnerHTML` anywhere in the code base. Comments are plain
  text, never HTML.
- Strict allow-list of authentication redirects on the Supabase side, never a
  wildcard.
- Password policy of 12 characters minimum and a check against known breaches
  ("leaked password protection" option, to enable on the hosted project; it
  does not exist in the CLI's local configuration).

To revisit if the service gains a backend of its own: move sessions to
`HttpOnly`, `Secure`, `SameSite=Lax` cookies.

## Secrets

- `.env` is never committed; `.env.example` is exhaustive and up to date.
- On the browser side, only `VITE_` variables are exposed: the Supabase URL and
  the anonymous key, public by design, with security resting on RLS.
- The `service_role` key exists only in the Edge Functions' and CI's secrets.
  It is never client-side.
- The cron jobs' shared secret lives in Vault (`cron_secret`), read at job
  execution time. No migration contains a secret. In local development,
  `seed.sql`, which never runs on a hosted environment, pins it to a known
  value so that local jobs work.
- `gitleaks` blocks any commit containing a secret (pre-commit and CI).

## Development-only endpoints

`dev-signup` creates an already-confirmed account, to test sign-up without
opening the confirmation email. It runs as `service_role`: its environment
guard is therefore its entire security.

That guard requires two independent signals, and it is evaluated **before** the
request body is read; nothing in the request can influence it:

- `APP_ENV=development`. The variable only lives in `supabase/functions/.env`,
  gitignored and never deployed: a hosted environment has no `APP_ENV`, so the
  door is closed by default, never through the omission of a prohibition.
- `SUPABASE_URL` must point at a local stack. In production it is a
  `*.supabase.co` domain: the second signal stays false even if the first one
  had been misconfigured by accident.

A single signal would leave the door one configuration mistake away from
unlocking `service_role` on a real environment. Outside development the
function answers `404` and not `403`: the caller does not learn that the
endpoint exists. On the browser side, the matching checkbox is rendered under
`import.meta.env.DEV`, which Vite inlines: the production bundle does not
contain the branch. This client-side check is a convenience, not a guarantee:
the only one that counts is the function's.

Any future function of this kind reuses `env.isDevelopment`
(`supabase/functions/_shared/env.ts`) rather than reading `APP_ENV` directly:
the guard stays in a single place.

## Document storage

Private bucket, never a public URL. Downloads go through 60-second signed URLs
generated on demand. Paths follow `{dossier_id}/{category}/{uuid}.{ext}`: the
file's original name never appears in the path (it may contain personal data)
and lives in a column. MIME types and size are constrained at the bucket policy
level, at the column level and on the client.

## Deletion and retention

Soft delete everywhere (`deleted_at`), purged after 30 days by
`purge_soft_deleted()` (daily cron), storage objects included.

Account deletion is refused while the person owns a dossier: erasing their
membership would leave that dossier without an owner and unreachable for the
relatives who depend on it. Comments are not erased but emptied and marked
deleted, with `author_id` set to null: the thread stays coherent for the other
members without naming someone who has left.

## Still to do

- RLS integration tests on documents and notification isolation.
- Captcha (Turnstile) on sign-up and password reset: the hook is planned, not
  enabled in V1.
- Documented rotation of the cron secret.
- Legal review of the `mentions-legales`, `confidentialite` and
  `conditions-generales` pages, whose content is still an annotated skeleton.

## Reporting a vulnerability

Write to the address given in the legal notice. Please do not open a public
issue for a vulnerability.
