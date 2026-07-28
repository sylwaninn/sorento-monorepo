-- ============================================================================
-- Member invitations. Application-level tokens, never Supabase auth links: only
-- the hash is stored, the raw token only ever exists in the invite link itself.
-- Generation/verification happens in Edge Functions (service_role), not via
-- client RLS: an unauthenticated invitee has no session to check has_dossier_access
-- against yet.
-- ============================================================================

create table invitations (
  id uuid primary key default gen_random_uuid(),
  dossier_id uuid not null references dossiers (id) on delete cascade,
  email text not null,
  role text not null check (role in ('collaborator', 'viewer')),
  message text,
  token_hash text not null unique,
  invited_by uuid not null references profiles (id),
  expires_at timestamptz not null,
  used_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

alter table invitations enable row level security;

create policy invitations_select on invitations for select to authenticated
  using (has_dossier_access(dossier_id, 'owner'));

-- Revocation only (owner sets revoked_at): generation/consumption of tokens always goes
-- through the Edge Functions via service_role.
create policy invitations_revoke on invitations for update to authenticated
  using (has_dossier_access(dossier_id, 'owner'))
  with check (has_dossier_access(dossier_id, 'owner'));

-- No client insert policy: rows are only ever created by the invite-member Edge Function
-- via service_role (token generation must not be client-driven).

-- ----------------------------------------------------------------------------
-- Ownership transfer: an atomic two-step role swap, so the partial unique index
-- on memberships (one owner per dossier) is never violated mid-transaction.
-- ----------------------------------------------------------------------------

create or replace function transfer_dossier_ownership(p_dossier_id uuid, p_new_owner_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not has_dossier_access(p_dossier_id, 'owner') then
    raise exception 'only the current owner can transfer ownership';
  end if;

  if not exists (
    select 1 from memberships
    where dossier_id = p_dossier_id and user_id = p_new_owner_user_id and role = 'collaborator'
  ) then
    raise exception 'the new owner must already be a collaborator on this dossier';
  end if;

  update memberships set role = 'collaborator' where dossier_id = p_dossier_id and user_id = auth.uid();
  update memberships set role = 'owner' where dossier_id = p_dossier_id and user_id = p_new_owner_user_id;

  insert into activity_log (dossier_id, actor_id, action_type, target_id, details)
  values (p_dossier_id, auth.uid(), 'ownership_transferred', p_new_owner_user_id, '{}'::jsonb);
end;
$$;
