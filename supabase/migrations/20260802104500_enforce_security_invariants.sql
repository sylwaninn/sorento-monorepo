-- ============================================================================
-- Security and lifecycle invariants that must hold below the RLS layer.
--
-- RLS decides which rows a caller may target. It does not stop a caller from
-- changing protected columns on an otherwise writable row, and PostgreSQL grants
-- EXECUTE on new functions to PUBLIC unless told otherwise. Keep both concerns
-- explicit here.
-- ============================================================================

-- A profile is self-editable, but its authorization role is not.
create or replace function guard_profile_role()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.role is distinct from old.role and auth.role() is distinct from 'service_role' then
    raise exception 'profile role is server-managed';
  end if;
  return new;
end;
$$;

create trigger trg_profiles_guard_role
  before update on profiles
  for each row execute function guard_profile_role();

-- The owner-facing update policies on invitations and trusted-contact
-- designations are revocation paths, not general token-management APIs.
create or replace function guard_invitation_revocation()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if auth.role() = 'service_role' then
    return new;
  end if;

  if (to_jsonb(new) - array['revoked_at', 'updated_at'])
      is distinct from
     (to_jsonb(old) - array['revoked_at', 'updated_at'])
    or old.revoked_at is not null
    or new.revoked_at is null then
    raise exception 'invitations may only be revoked';
  end if;
  return new;
end;
$$;

create trigger trg_invitations_guard_revocation
  before update on invitations
  for each row execute function guard_invitation_revocation();

create or replace function guard_trusted_contact_revocation()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if auth.role() = 'service_role' then
    return new;
  end if;

  if (to_jsonb(new) - array['revoked_at', 'updated_at'])
      is distinct from
     (to_jsonb(old) - array['revoked_at', 'updated_at'])
    or old.revoked_at is not null
    or new.revoked_at is null then
    raise exception 'trusted-contact designations may only be revoked';
  end if;
  return new;
end;
$$;

create trigger trg_trusted_contacts_guard_revocation
  before update on trusted_contact_designations
  for each row execute function guard_trusted_contact_revocation();

-- A notification recipient may mark the row read, but cannot rewrite the event
-- type, payload or email-delivery state.
create or replace function guard_notification_update()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if auth.role() = 'service_role' then
    return new;
  end if;

  if (to_jsonb(new) - array['read', 'updated_at'])
      is distinct from
     (to_jsonb(old) - array['read', 'updated_at']) then
    raise exception 'only notification read state is user-editable';
  end if;
  return new;
end;
$$;

create trigger trg_notifications_guard_update
  before update on notifications
  for each row execute function guard_notification_update();

-- Mention targets must be active dossier members. In particular, a dormant
-- trusted contact must not learn that a dossier exists before activation.
create or replace function validate_comment_mentions()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_mention uuid;
begin
  foreach v_mention in array coalesce(new.mentions, '{}'::uuid[])
  loop
    if not exists (
      select 1
      from memberships
      where dossier_id = new.dossier_id
        and user_id = v_mention
        and role in ('owner', 'collaborator', 'viewer')
    ) then
      raise exception 'mention target is not an active dossier member';
    end if;
  end loop;
  return new;
end;
$$;

create trigger trg_comments_validate_mentions
  before insert on comments
  for each row execute function validate_comment_mentions();

-- Every live dossier has exactly one owner. The partial unique index already
-- enforces "at most one"; this deferred constraint enforces "at least one"
-- while still allowing an atomic two-statement ownership transfer.
create or replace function ensure_dossier_has_owner()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_dossier_id uuid := coalesce(new.dossier_id, old.dossier_id);
begin
  if exists (select 1 from dossiers where id = v_dossier_id)
    and not exists (
      select 1 from memberships where dossier_id = v_dossier_id and role = 'owner'
    ) then
    raise exception 'a dossier must keep exactly one owner';
  end if;
  return coalesce(new, old);
end;
$$;

create constraint trigger trg_memberships_require_owner
  after insert or update or delete on memberships
  deferrable initially deferred
  for each row execute function ensure_dossier_has_owner();

-- One live designation keeps activation deterministic and makes token rotation
-- an explicit revoke-then-designate operation.
create unique index trusted_contact_one_live_designation
  on trusted_contact_designations (dossier_id)
  where revoked_at is null;

alter table dossiers
  add constraint dossiers_active_requires_death_date
  check (status <> 'ACTIVE' or death_date is not null);

-- Activation is irreversible. Promotion of a consented trusted contact is part
-- of the same database statement, so a failed owner transfer rolls everything
-- back instead of leaving the dossier ownerless.
create or replace function enforce_dossier_activation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_designation trusted_contact_designations%rowtype;
begin
  if old.status = 'ACTIVE' and new.status <> 'ACTIVE' then
    raise exception 'dossier activation is irreversible';
  end if;

  if old.status <> 'ACTIVE' and new.status = 'ACTIVE' then
    if new.death_date is null then
      raise exception 'death date is required to activate a dossier';
    end if;
    if old.activation_frozen_at is not null then
      raise exception 'dossier activation is frozen';
    end if;

    select * into v_designation
    from trusted_contact_designations
    where dossier_id = new.id
      and revoked_at is null
      and consented_by is not null
    for update;

    if found then
      if v_designation.future_role = 'owner' then
        update memberships
        set role = 'collaborator'
        where dossier_id = new.id and role = 'owner';
      end if;

      update memberships
      set role = v_designation.future_role
      where dossier_id = new.id
        and user_id = v_designation.consented_by
        and role = 'trusted_contact';

      if not found then
        raise exception 'consented trusted contact has no dormant membership';
      end if;
    end if;

    new.pending_activation_death_date := null;
    new.pending_activation_document_path := null;
    new.pending_activation_requested_by := null;
    new.pending_activation_requested_at := null;
    new.pending_activation_effective_at := null;
    new.pending_activation_opposed_at := null;
    new.pending_activation_opposed_by := null;
  end if;

  return new;
end;
$$;

create trigger trg_dossiers_enforce_activation
  before update on dossiers
  for each row execute function enforce_dossier_activation();

create or replace function log_dossier_activation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.status <> 'ACTIVE' and new.status = 'ACTIVE' then
    perform log_activity(
      new.id,
      'dossier_activated',
      null,
      jsonb_build_object('deathDate', new.death_date)
    );
  end if;
  return new;
end;
$$;

create trigger trg_dossiers_log_activation
  after update on dossiers
  for each row execute function log_dossier_activation();

-- Dossier creation always starts in preparation. Activation has its own
-- irreversible transition and requires a death date.
create or replace function create_dossier(
  p_subject_first_name text,
  p_subject_last_name text,
  p_status text default 'PREPARATION'
)
returns dossiers
language plpgsql
security definer
set search_path = public
as $$
declare
  v_dossier dossiers;
begin
  if auth.uid() is null then
    raise exception 'authentication required';
  end if;
  if p_status <> 'PREPARATION' then
    raise exception 'new dossiers must start in preparation';
  end if;

  insert into dossiers (created_by, subject_first_name, subject_last_name, status)
  values (auth.uid(), p_subject_first_name, p_subject_last_name, 'PREPARATION')
  returning * into v_dossier;

  return v_dossier;
end;
$$;

-- Activation may transfer ownership inside its BEFORE trigger. Run the update
-- as the function owner after checking the caller's current ownership, so the
-- caller does not fail the dossier UPDATE policy after being atomically demoted.
create or replace function activate_dossier(p_dossier_id uuid, p_death_date date)
returns dossiers
language plpgsql
security definer
set search_path = public
as $$
declare
  v_dossier dossiers;
begin
  if auth.role() <> 'service_role' and not is_dossier_owner(p_dossier_id) then
    raise exception 'only the owner can activate this dossier';
  end if;

  update dossiers
  set status = 'ACTIVE', death_date = p_death_date
  where id = p_dossier_id and status = 'PREPARATION'
  returning * into v_dossier;

  if not found then
    raise exception 'dossier is missing or already active';
  end if;
  return v_dossier;
end;
$$;

-- Replace the diagnostic answer set as one operation. Upsert alone leaves
-- answers to questions hidden by a changed branch, so stale values can keep
-- influencing eligibility and exports.
create or replace function sync_diagnostic_answers(p_dossier_id uuid, p_answers jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_key text;
  v_value jsonb;
  v_type text;
begin
  if not is_dossier_owner(p_dossier_id) then
    raise exception 'only the owner can replace diagnostic answers';
  end if;
  if jsonb_typeof(p_answers) <> 'object' then
    raise exception 'diagnostic answers must be a JSON object';
  end if;

  for v_key, v_value in select key, value from jsonb_each(p_answers)
  loop
    v_type := jsonb_typeof(v_value);
    if v_type not in ('string', 'number', 'boolean', 'array') then
      raise exception 'invalid diagnostic answer for %', v_key;
    end if;
    if v_type = 'array' and exists (
      select 1 from jsonb_array_elements(v_value) item
      where jsonb_typeof(item) <> 'string'
    ) then
      raise exception 'invalid diagnostic answer list for %', v_key;
    end if;
  end loop;

  delete from answers existing
  where existing.dossier_id = p_dossier_id
    and not exists (
      select 1 from jsonb_each(p_answers) incoming where incoming.key = existing.key
    );

  insert into answers (dossier_id, key, value)
  select p_dossier_id, incoming.key, incoming.value
  from jsonb_each(p_answers) incoming
  on conflict (dossier_id, key)
  do update set value = excluded.value;
end;
$$;

-- Deleting an account must not delete a long-lived designation, and a trusted
-- contact who consented must still be able to delete their own account.
alter table trusted_contact_designations
  alter column invited_by drop not null,
  drop constraint trusted_contact_designations_invited_by_fkey,
  add constraint trusted_contact_designations_invited_by_fkey
    foreign key (invited_by) references profiles (id) on delete set null,
  drop constraint trusted_contact_designations_consented_by_fkey,
  add constraint trusted_contact_designations_consented_by_fkey
    foreign key (consented_by) references profiles (id) on delete set null;

-- PostgreSQL grants EXECUTE to PUBLIC by default. Remove that implicit API from
-- server-only helpers and trigger functions; service_role keeps the explicit
-- paths used by Edge Functions.
revoke execute on function create_notification(uuid, uuid, uuid, text, uuid, jsonb) from public, anon, authenticated;
revoke execute on function resolve_notification_preference(uuid, uuid, text) from public, anon, authenticated;
revoke execute on function log_activity(uuid, text, uuid, jsonb) from public, anon, authenticated;
revoke execute on function invoke_edge_function(text) from public, anon, authenticated;
revoke execute on function purge_soft_deleted() from public, anon, authenticated;

grant execute on function create_notification(uuid, uuid, uuid, text, uuid, jsonb) to service_role;
grant execute on function resolve_notification_preference(uuid, uuid, text) to service_role;
grant execute on function log_activity(uuid, text, uuid, jsonb) to service_role;

revoke execute on function create_owner_on_dossier_insert() from public, anon, authenticated;
revoke execute on function handle_new_user() from public, anon, authenticated;
revoke execute on function log_answers_updated() from public, anon, authenticated;
revoke execute on function log_catalog_change() from public, anon, authenticated;
revoke execute on function log_document_added() from public, anon, authenticated;
revoke execute on function log_document_removed() from public, anon, authenticated;
revoke execute on function log_invitation_revoked() from public, anon, authenticated;
revoke execute on function log_tracking_change() from public, anon, authenticated;
revoke execute on function notify_on_comment_insert() from public, anon, authenticated;
revoke execute on function notify_on_membership_delete() from public, anon, authenticated;
revoke execute on function notify_on_membership_insert() from public, anon, authenticated;
revoke execute on function notify_on_tracking_change() from public, anon, authenticated;
revoke execute on function unassign_on_member_removed() from public, anon, authenticated;
revoke execute on function guard_profile_role() from public, anon, authenticated;
revoke execute on function guard_invitation_revocation() from public, anon, authenticated;
revoke execute on function guard_trusted_contact_revocation() from public, anon, authenticated;
revoke execute on function guard_notification_update() from public, anon, authenticated;
revoke execute on function validate_comment_mentions() from public, anon, authenticated;
revoke execute on function ensure_dossier_has_owner() from public, anon, authenticated;
revoke execute on function enforce_dossier_activation() from public, anon, authenticated;
revoke execute on function log_dossier_activation() from public, anon, authenticated;

revoke execute on function create_dossier(text, text, text) from public, anon;
grant execute on function create_dossier(text, text, text) to authenticated;
revoke execute on function activate_dossier(uuid, date) from public, anon;
grant execute on function activate_dossier(uuid, date) to authenticated, service_role;
revoke execute on function sync_diagnostic_answers(uuid, jsonb) from public, anon;
grant execute on function sync_diagnostic_answers(uuid, jsonb) to authenticated;
revoke execute on function delete_own_account() from public, anon;
grant execute on function delete_own_account() to authenticated;
revoke execute on function get_admin_metrics() from public, anon;
grant execute on function get_admin_metrics() to authenticated;
revoke execute on function get_cron_secret() from public, anon;
grant execute on function get_cron_secret() to authenticated, service_role;
revoke execute on function has_dossier_access(uuid, text) from public, anon;
grant execute on function has_dossier_access(uuid, text) to authenticated, service_role;
revoke execute on function is_admin() from public, anon;
grant execute on function is_admin() to authenticated, service_role;
revoke execute on function is_dossier_owner(uuid) from public, anon;
grant execute on function is_dossier_owner(uuid) to authenticated, service_role;
revoke execute on function log_letter_generation(uuid, uuid) from public, anon;
grant execute on function log_letter_generation(uuid, uuid) to authenticated;
revoke execute on function owned_dossier_count() from public, anon;
grant execute on function owned_dossier_count() to authenticated;
revoke execute on function release_activation_freeze(uuid) from public, anon;
grant execute on function release_activation_freeze(uuid) to authenticated;
revoke execute on function restore_dossier(uuid) from public, anon;
grant execute on function restore_dossier(uuid) to authenticated;
revoke execute on function soft_delete_dossier(uuid) from public, anon;
grant execute on function soft_delete_dossier(uuid) to authenticated;
revoke execute on function transfer_dossier_ownership(uuid, uuid) from public, anon;
grant execute on function transfer_dossier_ownership(uuid, uuid) to authenticated;
