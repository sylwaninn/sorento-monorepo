-- ============================================================================
-- Initial schema: profiles, dossiers, catalog, tracking, collaboration.
-- RLS enabled on every table from this migration onward (deny-all by default,
-- explicit policies translating the permission matrix).
-- ============================================================================

create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------------------
-- Utility functions
-- ----------------------------------------------------------------------------

create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ----------------------------------------------------------------------------
-- profiles
-- ----------------------------------------------------------------------------

create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  first_name text not null default '',
  role text not null default 'user' check (role in ('user', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_profiles_updated_at
  before update on profiles
  for each row execute function set_updated_at();

create or replace function is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from profiles where id = auth.uid() and role = 'admin'
  );
$$;

create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, first_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'first_name', ''));
  return new;
end;
$$;

create trigger trg_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

alter table profiles enable row level security;

-- profiles_select policy is created after memberships (it references that table).

create policy profiles_update_self on profiles for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- ----------------------------------------------------------------------------
-- dossiers
-- ----------------------------------------------------------------------------

create table dossiers (
  id uuid primary key default gen_random_uuid(),
  status text not null default 'PREPARATION' check (status in ('PREPARATION', 'ACTIVE')),
  -- Creator, independent of memberships: avoids a circular bootstrap where the SELECT
  -- policy would depend on a memberships row that only an AFTER INSERT trigger on this
  -- same dossier creates (INSERT ... RETURNING re-checks the SELECT policy before that
  -- trigger runs).
  created_by uuid not null references profiles (id) on delete restrict default auth.uid(),
  subject_first_name text not null,
  subject_last_name text not null,
  death_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create trigger trg_dossiers_updated_at
  before update on dossiers
  for each row execute function set_updated_at();

-- ----------------------------------------------------------------------------
-- memberships (declared before has_dossier_access, which depends on it)
-- ----------------------------------------------------------------------------

create table memberships (
  id uuid primary key default gen_random_uuid(),
  dossier_id uuid not null references dossiers (id) on delete cascade,
  user_id uuid not null references profiles (id) on delete cascade,
  role text not null check (role in ('owner', 'collaborator', 'viewer', 'trusted_contact')),
  invited_by uuid references profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (dossier_id, user_id)
);

create unique index memberships_unique_owner on memberships (dossier_id) where role = 'owner';

create trigger trg_memberships_updated_at
  before update on memberships
  for each row execute function set_updated_at();

alter table profiles enable row level security;

create policy profiles_select on profiles for select to authenticated
  using (
    id = auth.uid()
    or exists (
      select 1
      from memberships m1
      join memberships m2 on m2.dossier_id = m1.dossier_id
      where m1.user_id = auth.uid()
        and m2.user_id = profiles.id
        and m1.role in ('viewer', 'collaborator', 'owner')
        and m2.role in ('viewer', 'collaborator', 'owner')
    )
  );

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
    where m.dossier_id = p_dossier_id
      and m.user_id = auth.uid()
      and case p_min_role
        when 'viewer' then m.role in ('viewer', 'collaborator', 'owner')
        when 'collaborator' then m.role in ('collaborator', 'owner')
        when 'owner' then m.role = 'owner'
        else false
      end
  );
$$;

-- Ownership without looking at deleted_at. has_dossier_access ignores binned dossiers, which
-- is right for reading but turns against the very statement that bins one: the new row is
-- deleted, so the owner would "lose" access mid-update and the write would silently affect
-- zero rows. The update policy therefore asks this instead.
create or replace function is_dossier_owner(p_dossier_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from memberships
    where dossier_id = p_dossier_id and user_id = auth.uid() and role = 'owner'
  );
$$;

revoke execute on function is_dossier_owner(uuid) from public, anon;
grant execute on function is_dossier_owner(uuid) to authenticated, service_role;

-- Binning a dossier is the one write whose own result revokes the writer's access, which makes
-- it fight every formulation of an UPDATE policy. Creation already goes through
-- create_dossier() for the mirror-image reason; deletion joins it as an RPC, and the update
-- policy is left to cover ordinary edits only.
create or replace function soft_delete_dossier(p_dossier_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not is_dossier_owner(p_dossier_id) then
    raise exception 'only the owner can delete this dossier';
  end if;

  update dossiers set deleted_at = now() where id = p_dossier_id and deleted_at is null;

  insert into activity_log (dossier_id, actor_id, action_type, target_id, details)
  values (p_dossier_id, auth.uid(), 'dossier_deleted', null, '{}'::jsonb);
end;
$$;

revoke execute on function soft_delete_dossier(uuid) from public, anon;
grant execute on function soft_delete_dossier(uuid) to authenticated, service_role;

-- Restoring from the bin is the symmetric operation, still owner-only.
create or replace function restore_dossier(p_dossier_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not is_dossier_owner(p_dossier_id) then
    raise exception 'only the owner can restore this dossier';
  end if;

  update dossiers set deleted_at = null where id = p_dossier_id;
end;
$$;

revoke execute on function restore_dossier(uuid) from public, anon;
grant execute on function restore_dossier(uuid) to authenticated, service_role;

-- Auto-ownership: the creator of a dossier becomes its owner.
create or replace function create_owner_on_dossier_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into memberships (dossier_id, user_id, role)
  values (new.id, auth.uid(), 'owner');
  return new;
end;
$$;

create trigger trg_dossiers_create_owner
  after insert on dossiers
  for each row execute function create_owner_on_dossier_insert();

-- A removed member loses in-progress assignments; the event is logged.
create or replace function unassign_on_member_removed()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update tracking set assigned_to = null
  where dossier_id = old.dossier_id and assigned_to = old.user_id;

  insert into activity_log (dossier_id, actor_id, action_type, target_id, details)
  values (old.dossier_id, auth.uid(), 'member_removed', old.user_id, jsonb_build_object('role', old.role));

  return old;
end;
$$;

alter table dossiers enable row level security;

create policy dossiers_select on dossiers for select to authenticated
  using (deleted_at is null and (created_by = auth.uid() or has_dossier_access(id, 'viewer')));

create policy dossiers_insert on dossiers for insert to authenticated
  with check (created_by = auth.uid());

create policy dossiers_update on dossiers for update to authenticated
  using (is_dossier_owner(id))
  with check (is_dossier_owner(id));

alter table memberships enable row level security;

create policy memberships_select on memberships for select to authenticated
  using (has_dossier_access(dossier_id, 'viewer'));

create policy memberships_insert on memberships for insert to authenticated
  with check (has_dossier_access(dossier_id, 'owner'));

create policy memberships_update on memberships for update to authenticated
  using (has_dossier_access(dossier_id, 'owner'))
  with check (has_dossier_access(dossier_id, 'owner'));

create policy memberships_delete on memberships for delete to authenticated
  using (has_dossier_access(dossier_id, 'owner'));

-- ----------------------------------------------------------------------------
-- answers (diagnostic answers)
-- ----------------------------------------------------------------------------

create table answers (
  id uuid primary key default gen_random_uuid(),
  dossier_id uuid not null references dossiers (id) on delete cascade,
  key text not null,
  value jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (dossier_id, key)
);

create trigger trg_answers_updated_at
  before update on answers
  for each row execute function set_updated_at();

alter table answers enable row level security;

create policy answers_select on answers for select to authenticated
  using (has_dossier_access(dossier_id, 'viewer'));

create policy answers_insert on answers for insert to authenticated
  with check (has_dossier_access(dossier_id, 'owner'));

create policy answers_update on answers for update to authenticated
  using (has_dossier_access(dossier_id, 'owner'))
  with check (has_dossier_access(dossier_id, 'owner'));

-- ----------------------------------------------------------------------------
-- Catalog: procedures, benefits, conditions, letter_templates
-- Public read (the anonymous diagnostic needs it), admin-only write.
-- ----------------------------------------------------------------------------

create table procedures (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  title text not null,
  description text not null,
  organization text not null,
  recipient_address text,
  time_window text not null check (time_window in ('24h', '7d', '30d', '6m')),
  delay_days integer,
  reference_profession text,
  source_url text not null,
  last_verified_date date not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_procedures_updated_at
  before update on procedures
  for each row execute function set_updated_at();

alter table procedures enable row level security;

create policy procedures_select on procedures for select to anon, authenticated
  using (true);

create policy procedures_insert on procedures for insert to authenticated
  with check (is_admin());

create policy procedures_update on procedures for update to authenticated
  using (is_admin())
  with check (is_admin());

create policy procedures_delete on procedures for delete to authenticated
  using (is_admin());

create table benefits (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  title text not null,
  main_condition text not null,
  estimated_amount text,
  organization text not null,
  form_url text not null,
  caution_text text not null,
  time_window text not null check (time_window in ('24h', '7d', '30d', '6m')),
  source_url text not null,
  last_verified_date date not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_benefits_updated_at
  before update on benefits
  for each row execute function set_updated_at();

alter table benefits enable row level security;

create policy benefits_select on benefits for select to anon, authenticated
  using (true);

create policy benefits_insert on benefits for insert to authenticated
  with check (is_admin());

create policy benefits_update on benefits for update to authenticated
  using (is_admin())
  with check (is_admin());

create policy benefits_delete on benefits for delete to authenticated
  using (is_admin());

create table conditions (
  id uuid primary key default gen_random_uuid(),
  procedure_id uuid references procedures (id) on delete cascade,
  benefit_id uuid references benefits (id) on delete cascade,
  expression jsonb not null,
  created_at timestamptz not null default now(),
  constraint conditions_target_unique check (
    (procedure_id is not null)::int + (benefit_id is not null)::int = 1
  )
);

alter table conditions enable row level security;

create policy conditions_select on conditions for select to anon, authenticated
  using (true);

create policy conditions_insert on conditions for insert to authenticated
  with check (is_admin());

create policy conditions_update on conditions for update to authenticated
  using (is_admin())
  with check (is_admin());

create policy conditions_delete on conditions for delete to authenticated
  using (is_admin());

create table letter_templates (
  id uuid primary key default gen_random_uuid(),
  procedure_id uuid not null references procedures (id) on delete cascade,
  title text not null,
  body_template text not null,
  variables jsonb not null default '[]',
  source_url text,
  last_verified_date date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_letter_templates_updated_at
  before update on letter_templates
  for each row execute function set_updated_at();

alter table letter_templates enable row level security;

create policy letter_templates_select on letter_templates for select to anon, authenticated
  using (true);

create policy letter_templates_insert on letter_templates for insert to authenticated
  with check (is_admin());

create policy letter_templates_update on letter_templates for update to authenticated
  using (is_admin())
  with check (is_admin());

create policy letter_templates_delete on letter_templates for delete to authenticated
  using (is_admin());

-- ----------------------------------------------------------------------------
-- tracking
-- ----------------------------------------------------------------------------

create table tracking (
  id uuid primary key default gen_random_uuid(),
  dossier_id uuid not null references dossiers (id) on delete cascade,
  procedure_id uuid not null references procedures (id) on delete restrict,
  status text not null default 'todo' check (status in ('todo', 'in_progress', 'waiting', 'done', 'not_applicable')),
  assigned_to uuid references profiles (id) on delete set null,
  note text,
  due_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (dossier_id, procedure_id)
);

create trigger trg_tracking_updated_at
  before update on tracking
  for each row execute function set_updated_at();

-- assigned_to can only be an owner or collaborator of the dossier, never a viewer.
create or replace function validate_assignment()
returns trigger
language plpgsql
as $$
begin
  if new.assigned_to is not null then
    if not exists (
      select 1 from memberships
      where dossier_id = new.dossier_id
        and user_id = new.assigned_to
        and role in ('owner', 'collaborator')
    ) then
      raise exception 'assigned_to must be an owner or collaborator of the dossier';
    end if;
  end if;
  return new;
end;
$$;

create trigger trg_tracking_validate_assignment
  before insert or update on tracking
  for each row execute function validate_assignment();

alter table tracking enable row level security;

create policy tracking_select on tracking for select to authenticated
  using (has_dossier_access(dossier_id, 'viewer'));

create policy tracking_insert on tracking for insert to authenticated
  with check (has_dossier_access(dossier_id, 'collaborator'));

create policy tracking_update on tracking for update to authenticated
  using (has_dossier_access(dossier_id, 'collaborator'))
  with check (has_dossier_access(dossier_id, 'collaborator'));

create trigger trg_memberships_unassign_on_removed
  after delete on memberships
  for each row execute function unassign_on_member_removed();

-- ----------------------------------------------------------------------------
-- comments
-- ----------------------------------------------------------------------------

create table comments (
  id uuid primary key default gen_random_uuid(),
  dossier_id uuid not null references dossiers (id) on delete cascade,
  procedure_id uuid references procedures (id) on delete cascade,
  author_id uuid not null references profiles (id) on delete restrict,
  content text not null,
  mentions uuid[] not null default '{}',
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

-- No editing in V1: only the deleted_at column may change after creation.
create or replace function prevent_comment_edit()
returns trigger
language plpgsql
as $$
begin
  if new.dossier_id is distinct from old.dossier_id
    or new.procedure_id is distinct from old.procedure_id
    or new.mentions is distinct from old.mentions
    or new.created_at is distinct from old.created_at then
    raise exception 'Comments cannot be edited, only deleted';
  end if;

  -- Losing the author is not an edit: account deletion nulls author_id out, and that arrives
  -- here as an UPDATE. Allow that one transition, and only in that direction.
  if new.author_id is distinct from old.author_id and new.author_id is not null then
    raise exception 'Comments cannot be reattributed';
  end if;

  -- Content may only ever be cleared, and only while the comment is being deleted. That is
  -- erasure, not editing.
  if new.content is distinct from old.content
    and not (new.content = '' and new.deleted_at is not null) then
    raise exception 'Comments cannot be edited, only deleted';
  end if;

  return new;
end;
$$;

create trigger trg_comments_prevent_edit
  before update on comments
  for each row execute function prevent_comment_edit();

alter table comments enable row level security;

create policy comments_select on comments for select to authenticated
  using (has_dossier_access(dossier_id, 'viewer'));

create policy comments_insert on comments for insert to authenticated
  with check (has_dossier_access(dossier_id, 'viewer') and author_id = auth.uid());

create policy comments_soft_delete on comments for update to authenticated
  using (
    has_dossier_access(dossier_id, 'viewer')
    and (author_id = auth.uid() or has_dossier_access(dossier_id, 'owner'))
  )
  with check (
    has_dossier_access(dossier_id, 'viewer')
    and (author_id = auth.uid() or has_dossier_access(dossier_id, 'owner'))
  );

-- ----------------------------------------------------------------------------
-- notifications
-- ----------------------------------------------------------------------------

create table notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id) on delete cascade,
  dossier_id uuid references dossiers (id) on delete cascade,
  type text not null,
  target_id uuid,
  read boolean not null default false,
  payload jsonb not null default '{}',
  created_at timestamptz not null default now()
);

alter table notifications enable row level security;

create policy notifications_select on notifications for select to authenticated
  using (user_id = auth.uid());

create policy notifications_update on notifications for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ----------------------------------------------------------------------------
-- documents
-- ----------------------------------------------------------------------------

create table documents (
  id uuid primary key default gen_random_uuid(),
  dossier_id uuid not null references dossiers (id) on delete cascade,
  category text not null,
  storage_path text not null,
  original_name text not null,
  mime_type text not null check (mime_type in ('application/pdf', 'image/jpeg', 'image/png')),
  size_bytes bigint not null check (size_bytes > 0 and size_bytes <= 10485760),
  added_by uuid not null references profiles (id) on delete restrict,
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

alter table documents enable row level security;

create policy documents_select on documents for select to authenticated
  using (has_dossier_access(dossier_id, 'viewer'));

create policy documents_insert on documents for insert to authenticated
  with check (has_dossier_access(dossier_id, 'collaborator') and added_by = auth.uid());

create policy documents_soft_delete on documents for update to authenticated
  using (
    has_dossier_access(dossier_id, 'collaborator')
    and (added_by = auth.uid() or has_dossier_access(dossier_id, 'owner'))
  )
  with check (
    has_dossier_access(dossier_id, 'collaborator')
    and (added_by = auth.uid() or has_dossier_access(dossier_id, 'owner'))
  );

-- ----------------------------------------------------------------------------
-- activity_log (read-only activity feed for members)
-- ----------------------------------------------------------------------------

create table activity_log (
  id uuid primary key default gen_random_uuid(),
  dossier_id uuid not null references dossiers (id) on delete cascade,
  actor_id uuid references profiles (id) on delete set null,
  action_type text not null,
  target_id uuid,
  details jsonb not null default '{}',
  created_at timestamptz not null default now()
);

alter table activity_log enable row level security;

create policy activity_log_select on activity_log for select to authenticated
  using (has_dossier_access(dossier_id, 'viewer'));

create policy activity_log_insert on activity_log for insert to authenticated
  with check (has_dossier_access(dossier_id, 'collaborator'));

-- ----------------------------------------------------------------------------
-- catalog_history (audit of catalog changes, admin only)
-- ----------------------------------------------------------------------------

create table catalog_history (
  id uuid primary key default gen_random_uuid(),
  catalog_table text not null check (catalog_table in ('procedures', 'benefits', 'conditions', 'letter_templates')),
  row_id uuid not null,
  action text not null check (action in ('created', 'updated', 'deleted')),
  old_content jsonb,
  new_content jsonb,
  modified_by uuid not null references profiles (id),
  created_at timestamptz not null default now()
);

alter table catalog_history enable row level security;

create policy catalog_history_select on catalog_history for select to authenticated
  using (is_admin());

create policy catalog_history_insert on catalog_history for insert to authenticated
  with check (is_admin());
