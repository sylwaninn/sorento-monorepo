-- ============================================================================
-- Preparation-mode data: contract inventory, guided wishes, trusted-contact
-- designation, and the pending-activation grace period. Trusted-contact
-- designation/activation deliberately has NO client RLS path at all: like
-- invitations, it only ever goes through Edge Functions (service_role) because
-- an unauthenticated or not-yet-a-member contact has nothing has_dossier_access
-- could check yet.
-- ============================================================================

create table contracts (
  id uuid primary key default gen_random_uuid(),
  dossier_id uuid not null references dossiers (id) on delete cascade,
  contract_type text not null,
  company text not null,
  contract_number text,
  known_beneficiaries text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_contracts_updated_at
  before update on contracts
  for each row execute function set_updated_at();

alter table contracts enable row level security;

create policy contracts_select on contracts for select to authenticated
  using (has_dossier_access(dossier_id, 'viewer'));

create policy contracts_insert on contracts for insert to authenticated
  with check (has_dossier_access(dossier_id, 'collaborator'));

create policy contracts_update on contracts for update to authenticated
  using (has_dossier_access(dossier_id, 'collaborator'))
  with check (has_dossier_access(dossier_id, 'collaborator'));

create policy contracts_delete on contracts for delete to authenticated
  using (has_dossier_access(dossier_id, 'collaborator'));

-- ----------------------------------------------------------------------------
-- preparation_wishes: one row per dossier, guided instructions. Not a will:
-- E25's notice makes that explicit in the UI. Owner-only write: personal and
-- sensitive, unlike the shared collaborative data elsewhere.
-- ----------------------------------------------------------------------------

create table preparation_wishes (
  dossier_id uuid primary key references dossiers (id) on delete cascade,
  funeral_wishes text,
  people_to_notify text,
  document_location text,
  updated_at timestamptz not null default now()
);

create trigger trg_preparation_wishes_updated_at
  before update on preparation_wishes
  for each row execute function set_updated_at();

alter table preparation_wishes enable row level security;

create policy preparation_wishes_select on preparation_wishes for select to authenticated
  using (has_dossier_access(dossier_id, 'viewer'));

create policy preparation_wishes_insert on preparation_wishes for insert to authenticated
  with check (has_dossier_access(dossier_id, 'owner'));

create policy preparation_wishes_update on preparation_wishes for update to authenticated
  using (has_dossier_access(dossier_id, 'owner'))
  with check (has_dossier_access(dossier_id, 'owner'));

-- ----------------------------------------------------------------------------
-- Trusted-contact designation. Two tokens, two purposes:
--  - consent_token_hash (48h, per CLAUDE.md section 6): acknowledges the
--    designation and creates the dormant trusted_contact membership.
--  - activation_token_hash (long-lived, generated only once consent happens):
--    the actual "in case of death" link. A single-use-48h token can't be the
--    one used for an event that may happen years later, so it's a distinct,
--    longer-lived credential, re-requestable if it's ever lost or expires.
-- ----------------------------------------------------------------------------

create table trusted_contact_designations (
  id uuid primary key default gen_random_uuid(),
  dossier_id uuid not null references dossiers (id) on delete cascade,
  email text not null,
  future_role text not null check (future_role in ('owner', 'collaborator')),
  consent_token_hash text unique,
  consent_expires_at timestamptz,
  consented_at timestamptz,
  activation_token_hash text unique,
  activation_expires_at timestamptz,
  invited_by uuid not null references profiles (id),
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

alter table trusted_contact_designations enable row level security;

create policy trusted_contact_designations_select on trusted_contact_designations for select to authenticated
  using (has_dossier_access(dossier_id, 'owner'));

create policy trusted_contact_designations_revoke on trusted_contact_designations for update to authenticated
  using (has_dossier_access(dossier_id, 'owner'))
  with check (has_dossier_access(dossier_id, 'owner'));

-- No client insert policy: only the designate-trusted-contact Edge Function (service_role)
-- creates rows.

-- ----------------------------------------------------------------------------
-- Pending activation (48h grace period, section 8.3). One pending activation at
-- a time per dossier: starting a new one while another is pending is rejected
-- at the Edge Function level.
-- ----------------------------------------------------------------------------

alter table dossiers
  add column pending_activation_death_date date,
  add column pending_activation_document_path text,
  add column pending_activation_requested_by uuid references profiles (id),
  add column pending_activation_requested_at timestamptz,
  add column pending_activation_effective_at timestamptz,
  add column pending_activation_opposed_at timestamptz,
  add column pending_activation_opposed_by uuid references profiles (id);
