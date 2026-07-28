-- ============================================================================
-- Notification preferences + reactive triggers that create in-app rows and flag
-- immediate emails. Deadline/waiting reminders are NOT created here — they're
-- computed entirely by the daily-reminders Edge Function (grouping + the
-- one-email-per-dossier-per-day cap only make sense computed in one pass).
-- ============================================================================

create extension if not exists pg_net;

alter table notifications
  add column email_status text not null default 'not_applicable'
    check (email_status in ('pending', 'sent', 'skipped', 'not_applicable'));

create table notification_preferences (
  user_id uuid not null references profiles (id) on delete cascade,
  event_type text not null,
  in_app boolean not null,
  email boolean not null,
  primary key (user_id, event_type)
);

alter table notification_preferences enable row level security;

create policy notification_preferences_select on notification_preferences for select to authenticated
  using (user_id = auth.uid());

create policy notification_preferences_insert on notification_preferences for insert to authenticated
  with check (user_id = auth.uid());

create policy notification_preferences_update on notification_preferences for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy notification_preferences_delete on notification_preferences for delete to authenticated
  using (user_id = auth.uid());

-- ----------------------------------------------------------------------------
-- Preference resolution: explicit override row > role-aware default.
-- "A viewer receives only mentions and activation by default" (spec 8.2) — a
-- viewer's default is silence except for those two types, unless they opt in.
-- ----------------------------------------------------------------------------

create or replace function resolve_notification_preference(
  p_user_id uuid,
  p_dossier_id uuid,
  p_event_type text,
  out p_in_app boolean,
  out p_email boolean
)
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_override notification_preferences%rowtype;
  v_role text;
  v_default_in_app boolean;
  v_default_email boolean;
begin
  select * into v_override from notification_preferences
  where user_id = p_user_id and event_type = p_event_type;

  if found then
    p_in_app := v_override.in_app;
    p_email := v_override.email;
    return;
  end if;

  select role into v_role from memberships where dossier_id = p_dossier_id and user_id = p_user_id;

  case p_event_type
    when 'procedure_assigned' then v_default_in_app := true; v_default_email := true;
    when 'mention' then v_default_in_app := true; v_default_email := true;
    when 'comment_on_assigned_procedure' then v_default_in_app := true; v_default_email := false;
    when 'status_changed_on_assigned_procedure' then v_default_in_app := true; v_default_email := false;
    when 'deadline_approaching' then v_default_in_app := true; v_default_email := true;
    when 'prolonged_waiting' then v_default_in_app := true; v_default_email := true;
    when 'member_joined' then v_default_in_app := true; v_default_email := false;
    when 'member_left' then v_default_in_app := true; v_default_email := false;
    when 'dossier_activated' then v_default_in_app := true; v_default_email := true;
    else v_default_in_app := false; v_default_email := false;
  end case;

  if v_role = 'viewer' and p_event_type not in ('mention', 'dossier_activated') then
    p_in_app := false;
    p_email := false;
  else
    p_in_app := v_default_in_app;
    p_email := v_default_email;
  end if;
end;
$$;

-- ----------------------------------------------------------------------------
-- notify(): shared insert helper. Never notifies the actor about their own action.
-- ----------------------------------------------------------------------------

create or replace function create_notification(
  p_user_id uuid,
  p_actor_id uuid,
  p_dossier_id uuid,
  p_type text,
  p_target_id uuid,
  p_payload jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_in_app boolean;
  v_email boolean;
begin
  if p_user_id = p_actor_id then
    return;
  end if;

  select p_in_app, p_email into v_in_app, v_email from resolve_notification_preference(p_user_id, p_dossier_id, p_type);

  if not v_in_app and not v_email then
    return;
  end if;

  insert into notifications (user_id, dossier_id, type, target_id, payload, email_status)
  values (
    p_user_id, p_dossier_id, p_type, p_target_id, p_payload,
    case when v_email then 'pending' else 'not_applicable' end
  );
end;
$$;

-- ----------------------------------------------------------------------------
-- Reactive triggers
-- ----------------------------------------------------------------------------

create or replace function notify_on_tracking_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.assigned_to is distinct from old.assigned_to and new.assigned_to is not null then
    perform create_notification(
      new.assigned_to, auth.uid(), new.dossier_id, 'procedure_assigned',
      coalesce(new.procedure_id, new.benefit_id), jsonb_build_object('trackingId', new.id)
    );
  elsif new.status is distinct from old.status and old.assigned_to is not null then
    perform create_notification(
      old.assigned_to, auth.uid(), new.dossier_id, 'status_changed_on_assigned_procedure',
      coalesce(new.procedure_id, new.benefit_id), jsonb_build_object('status', new.status)
    );
  end if;
  return new;
end;
$$;

create trigger trg_tracking_notify_change
  after update on tracking
  for each row execute function notify_on_tracking_change();

create or replace function notify_on_comment_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_mentioned uuid;
  v_assignee uuid;
begin
  foreach v_mentioned in array new.mentions loop
    perform create_notification(
      v_mentioned, new.author_id, new.dossier_id, 'mention', new.id, jsonb_build_object('procedureId', new.procedure_id)
    );
  end loop;

  if new.procedure_id is not null then
    select assigned_to into v_assignee from tracking
    where dossier_id = new.dossier_id and procedure_id = new.procedure_id;

    if v_assignee is not null and not (v_assignee = any(new.mentions)) then
      perform create_notification(
        v_assignee, new.author_id, new.dossier_id, 'comment_on_assigned_procedure', new.id,
        jsonb_build_object('procedureId', new.procedure_id)
      );
    end if;
  end if;

  return new;
end;
$$;

create trigger trg_comments_notify_insert
  after insert on comments
  for each row execute function notify_on_comment_insert();

create or replace function notify_on_membership_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_member_id uuid;
begin
  for v_member_id in
    select user_id from memberships where dossier_id = new.dossier_id and user_id <> new.user_id
  loop
    perform create_notification(v_member_id, new.user_id, new.dossier_id, 'member_joined', new.user_id, '{}'::jsonb);
  end loop;
  return new;
end;
$$;

create trigger trg_memberships_notify_join
  after insert on memberships
  for each row execute function notify_on_membership_insert();

create or replace function notify_on_membership_delete()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_member_id uuid;
begin
  for v_member_id in
    select user_id from memberships where dossier_id = old.dossier_id
  loop
    perform create_notification(v_member_id, auth.uid(), old.dossier_id, 'member_left', old.user_id, '{}'::jsonb);
  end loop;
  return old;
end;
$$;

create trigger trg_memberships_notify_leave
  after delete on memberships
  for each row execute function notify_on_membership_delete();
