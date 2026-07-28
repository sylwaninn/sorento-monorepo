-- ============================================================================
-- Account deletion (E13). Two things had to change first.
--
-- 1. Several foreign keys pointed at profiles with the default RESTRICT, so deleting
--    an account was impossible as soon as the person had ever written a comment,
--    uploaded a document or created a dossier. They now null out instead: the shared
--    history other members rely on survives, without naming someone who left.
-- 2. Deletion is refused while the account still owns a dossier, because removing the
--    membership would leave that dossier ownerless and unreachable for the relatives
--    who still depend on it. The settings screen says so before offering the button.
-- ============================================================================

alter table comments alter column author_id drop not null;
alter table comments drop constraint comments_author_id_fkey;
alter table comments add constraint comments_author_id_fkey
  foreign key (author_id) references profiles (id) on delete set null;

alter table documents alter column added_by drop not null;
alter table documents drop constraint documents_added_by_fkey;
alter table documents add constraint documents_added_by_fkey
  foreign key (added_by) references profiles (id) on delete set null;

alter table dossiers alter column created_by drop not null;
alter table dossiers drop constraint dossiers_created_by_fkey;
alter table dossiers add constraint dossiers_created_by_fkey
  foreign key (created_by) references profiles (id) on delete set null;

alter table catalog_history drop constraint catalog_history_modified_by_fkey;
alter table catalog_history add constraint catalog_history_modified_by_fkey
  foreign key (modified_by) references profiles (id) on delete set null;

alter table invitations drop constraint invitations_invited_by_fkey;
alter table invitations add constraint invitations_invited_by_fkey
  foreign key (invited_by) references profiles (id) on delete cascade;

alter table trusted_contact_designations drop constraint trusted_contact_designations_invited_by_fkey;
alter table trusted_contact_designations add constraint trusted_contact_designations_invited_by_fkey
  foreign key (invited_by) references profiles (id) on delete cascade;

-- comments_insert still forces author_id = auth.uid(), so the nullable column cannot be
-- used to post anonymously; it only ever becomes null when the account disappears.
drop policy comments_insert on comments;
create policy comments_insert on comments for insert to authenticated
  with check (has_dossier_access(dossier_id, 'viewer') and author_id = auth.uid());

drop policy documents_insert on documents;
create policy documents_insert on documents for insert to authenticated
  with check (has_dossier_access(dossier_id, 'collaborator') and added_by = auth.uid());

-- ----------------------------------------------------------------------------

create or replace function owned_dossier_count()
returns integer
language sql
security definer
set search_path = public
stable
as $$
  -- Soft-deleted dossiers count too: while a dossier sits in the 30-day bin its owner can
  -- still restore it, so erasing the account would orphan it and trip
  -- trg_memberships_require_owner with an internal error instead of this guard's message.
  select count(*)::integer
  from memberships m
  join dossiers d on d.id = m.dossier_id
  where m.user_id = auth.uid()
    and m.role = 'owner';
$$;

revoke execute on function owned_dossier_count() from public, anon;
grant execute on function owned_dossier_count() to authenticated, service_role;

create or replace function delete_own_account()
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'authentication required';
  end if;

  if owned_dossier_count() > 0 then
    raise exception 'transfer or delete the dossiers you own before deleting your account';
  end if;

  -- The comment bodies go; the thread keeps its "commentaire supprimé" trace so the
  -- conversation other members remember stays coherent.
  update comments
  set content = '', deleted_at = coalesce(deleted_at, now())
  where author_id = v_user_id;

  -- Deleting auth.users cascades to profiles, which cascades to memberships, whose removal
  -- trigger journals a "member_removed" event attributed to the person leaving, whose profile
  -- no longer exists at that point in the transaction. Memberships go first, while the actor is
  -- still a real profile, so the dossiers keep an honest trace of the departure.
  delete from memberships where user_id = v_user_id;

  -- profiles cascades from auth.users; every remaining reference nulls out per the
  -- foreign keys above.
  delete from auth.users where id = v_user_id;
end;
$$;

revoke execute on function delete_own_account() from public, anon;
grant execute on function delete_own_account() to authenticated, service_role;
