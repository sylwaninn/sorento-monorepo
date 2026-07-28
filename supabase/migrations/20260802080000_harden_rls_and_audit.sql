-- ============================================================================
-- Security hardening of the permission model.
--
-- 1. The activity log becomes server-authored. A client could previously insert
--    any actor_id, so the very feature meant to defuse family conflicts
--    ("who told the bank to freeze the account?") was forgeable, and a
--    fire-and-forget client write silently lost events.
-- 2. has_dossier_access now ignores soft-deleted dossiers: the 30-day bin has to
--    actually revoke access, not just hide the dossier row.
-- 3. dossiers_select stops granting permanent access to created_by. Creation now
--    goes through create_dossier(), which sidesteps the INSERT ... RETURNING
--    bootstrap the old clause worked around.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Soft-deleted dossiers revoke access everywhere
-- ----------------------------------------------------------------------------

create or replace function has_dossier_access(p_dossier_id uuid, p_min_role text default 'viewer')
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from memberships m
    join dossiers d on d.id = m.dossier_id
    where m.dossier_id = p_dossier_id
      and m.user_id = auth.uid()
      and d.deleted_at is null
      and case p_min_role
        when 'viewer' then m.role in ('viewer', 'collaborator', 'owner')
        when 'collaborator' then m.role in ('collaborator', 'owner')
        when 'owner' then m.role = 'owner'
        else false
      end
  );
$$;

-- ----------------------------------------------------------------------------
-- 2. Dossier creation through an RPC, so created_by stops being an access grant
-- ----------------------------------------------------------------------------

-- Insert + owner membership in one transaction, under security definer, so the
-- SELECT policy no longer has to tolerate a creator with no membership row yet.
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
  if p_status not in ('PREPARATION', 'ACTIVE') then
    raise exception 'invalid dossier status: %', p_status;
  end if;

  insert into dossiers (created_by, subject_first_name, subject_last_name, status)
  values (auth.uid(), p_subject_first_name, p_subject_last_name, p_status)
  returning * into v_dossier;

  return v_dossier;
end;
$$;

revoke execute on function create_dossier(text, text, text) from anon;

drop policy dossiers_insert on dossiers;

drop policy dossiers_select on dossiers;
create policy dossiers_select on dossiers for select to authenticated
  using (deleted_at is null and has_dossier_access(id, 'viewer'));

-- ----------------------------------------------------------------------------
-- 3. Server-authored activity log
-- ----------------------------------------------------------------------------

-- No client write path at all: every event below comes from a trigger or from an
-- Edge Function running as service_role (which bypasses RLS).
drop policy activity_log_insert on activity_log;

create or replace function log_activity(
  p_dossier_id uuid,
  p_action_type text,
  p_target_id uuid,
  p_details jsonb
)
returns void
language sql
security definer
set search_path = public
as $$
  insert into activity_log (dossier_id, actor_id, action_type, target_id, details)
  values (p_dossier_id, auth.uid(), p_action_type, p_target_id, p_details);
$$;

create or replace function log_tracking_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status is distinct from old.status then
    perform log_activity(
      new.dossier_id, 'status_changed', coalesce(new.procedure_id, new.benefit_id),
      jsonb_build_object('status', new.status, 'previousStatus', old.status)
    );
  end if;

  if new.assigned_to is distinct from old.assigned_to then
    perform log_activity(
      new.dossier_id, 'assignment_changed', coalesce(new.procedure_id, new.benefit_id),
      jsonb_build_object('assignedTo', new.assigned_to)
    );
  end if;

  return new;
end;
$$;

create trigger trg_tracking_log_change
  after update on tracking
  for each row execute function log_tracking_change();

create or replace function log_document_added()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform log_activity(
    new.dossier_id, 'document_added', new.id, jsonb_build_object('category', new.category)
  );
  return new;
end;
$$;

create trigger trg_documents_log_added
  after insert on documents
  for each row execute function log_document_added();

create or replace function log_document_removed()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.deleted_at is not null and old.deleted_at is null then
    perform log_activity(
      new.dossier_id, 'document_removed', new.id, jsonb_build_object('category', new.category)
    );
  end if;
  return new;
end;
$$;

create trigger trg_documents_log_removed
  after update on documents
  for each row execute function log_document_removed();

create or replace function log_answers_updated()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform log_activity(new.dossier_id, 'answers_updated', null, jsonb_build_object('key', new.key));
  return new;
end;
$$;

-- Statement-level would be cheaper, but the answer key is the useful part of the entry
-- and only a row trigger sees it. The diagnostic writes a handful of rows at a time.
create trigger trg_answers_log_updated
  after insert or update on answers
  for each row execute function log_answers_updated();

create or replace function log_invitation_revoked()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.revoked_at is not null and old.revoked_at is null then
    perform log_activity(
      new.dossier_id, 'invitation_revoked', new.id, jsonb_build_object('email', new.email)
    );
  end if;
  return new;
end;
$$;

create trigger trg_invitations_log_revoked
  after update on invitations
  for each row execute function log_invitation_revoked();

-- Letter generation happens client-side (PDF), so it has no natural trigger. This RPC is
-- the only client-callable log entry point, and it still stamps actor_id server-side.
create or replace function log_letter_generation(p_dossier_id uuid, p_procedure_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not has_dossier_access(p_dossier_id, 'collaborator') then
    raise exception 'forbidden';
  end if;
  perform log_activity(p_dossier_id, 'letter_generated', p_procedure_id, '{}'::jsonb);
end;
$$;

revoke execute on function log_letter_generation(uuid, uuid) from anon;

-- The removal trigger predates log_activity(); route it through the same helper so the
-- actor is stamped identically everywhere.
create or replace function unassign_on_member_removed()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update tracking set assigned_to = null
  where dossier_id = old.dossier_id and assigned_to = old.user_id;

  perform log_activity(old.dossier_id, 'member_removed', old.user_id, jsonb_build_object('role', old.role));

  return old;
end;
$$;

-- ----------------------------------------------------------------------------
-- 4. "Never notify your own action" also holds when there is no auth.uid()
-- ----------------------------------------------------------------------------

-- A service_role or cron path has auth.uid() = null, and null <> user_id, so the
-- self-notification guard in create_notification silently let the actor through.
create or replace function notify_on_membership_delete()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_member_id uuid;
  v_actor_id uuid := coalesce(auth.uid(), old.user_id);
begin
  for v_member_id in
    select user_id from memberships where dossier_id = old.dossier_id
  loop
    perform create_notification(v_member_id, v_actor_id, old.dossier_id, 'member_left', old.user_id, '{}'::jsonb);
  end loop;
  return old;
end;
$$;

-- ----------------------------------------------------------------------------
-- 5. updated_at everywhere it was missing
-- ----------------------------------------------------------------------------

alter table comments add column updated_at timestamptz not null default now();
alter table documents add column updated_at timestamptz not null default now();
alter table conditions add column updated_at timestamptz not null default now();
alter table notifications add column updated_at timestamptz not null default now();
alter table invitations add column updated_at timestamptz not null default now();
alter table trusted_contact_designations add column updated_at timestamptz not null default now();

create trigger trg_comments_updated_at
  before update on comments
  for each row execute function set_updated_at();

create trigger trg_documents_updated_at
  before update on documents
  for each row execute function set_updated_at();

create trigger trg_conditions_updated_at
  before update on conditions
  for each row execute function set_updated_at();

create trigger trg_notifications_updated_at
  before update on notifications
  for each row execute function set_updated_at();

create trigger trg_invitations_updated_at
  before update on invitations
  for each row execute function set_updated_at();

create trigger trg_trusted_contact_designations_updated_at
  before update on trusted_contact_designations
  for each row execute function set_updated_at();

-- ----------------------------------------------------------------------------
-- 6. Indexes for the foreign keys every RLS policy and list screen walks
-- ----------------------------------------------------------------------------

create index memberships_user_id_idx on memberships (user_id);
create index tracking_dossier_id_idx on tracking (dossier_id);
create index tracking_assigned_to_idx on tracking (assigned_to) where assigned_to is not null;
create index comments_dossier_id_idx on comments (dossier_id, created_at desc);
create index documents_dossier_id_idx on documents (dossier_id) where deleted_at is null;
create index answers_dossier_id_idx on answers (dossier_id);
create index contracts_dossier_id_idx on contracts (dossier_id);
create index activity_log_dossier_id_idx on activity_log (dossier_id, created_at desc);
create index notifications_user_id_idx on notifications (user_id, read, created_at desc);
create index notifications_email_status_idx on notifications (email_status) where email_status = 'pending';
create index invitations_dossier_id_idx on invitations (dossier_id);
create index trusted_contact_designations_dossier_id_idx on trusted_contact_designations (dossier_id);
create index conditions_procedure_id_idx on conditions (procedure_id) where procedure_id is not null;
create index conditions_benefit_id_idx on conditions (benefit_id) where benefit_id is not null;
create index letter_templates_procedure_id_idx on letter_templates (procedure_id);
