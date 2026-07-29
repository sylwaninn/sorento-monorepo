-- ============================================================================
-- Two things the scheduled jobs were missing.
--
-- 1. The cron shared secret and the functions base URL were hardcoded in the
--    migrations that scheduled the jobs, so they lived in git and would have
--    become the production values on replay. They move to Vault, read at job
--    execution time, and the job bodies below contain no secret at all.
-- 2. The 30-day bin was never emptied. Soft-deleted dossiers, documents and
--    comments accumulated forever, and storage objects were never reclaimed.
-- ============================================================================

create extension if not exists supabase_vault with schema vault;

-- ----------------------------------------------------------------------------
-- Vault-backed job configuration
-- ----------------------------------------------------------------------------

-- Seeded once per database. `app.cron_secret` / `app.functions_base_url` let CI and
-- hosted environments inject their own values before migrating
-- (alter database <db> set app.cron_secret = '...'); a local stack falls back to a
-- freshly generated secret, readable through get_cron_secret() below.
do $$
declare
  v_secret text := coalesce(nullif(current_setting('app.cron_secret', true), ''), encode(gen_random_bytes(32), 'hex'));
  v_base_url text := coalesce(nullif(current_setting('app.functions_base_url', true), ''), 'http://kong:8000/functions/v1');
begin
  if not exists (select 1 from vault.secrets where name = 'cron_secret') then
    perform vault.create_secret(v_secret, 'cron_secret', 'Shared secret guarding cron-invoked Edge Functions');
  end if;

  if not exists (select 1 from vault.secrets where name = 'functions_base_url') then
    perform vault.create_secret(v_base_url, 'functions_base_url', 'Base URL used by pg_cron to reach the Edge Functions');
  end if;
end;
$$;

-- Local-dev convenience: prints the generated secret so it can be copied into
-- supabase/functions/.env. Admin-only, because it returns a live credential.
create or replace function get_cron_secret()
returns text
language plpgsql
security definer
set search_path = public, vault
as $$
begin
  if not is_admin() then
    raise exception 'forbidden';
  end if;
  return (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret');
end;
$$;

revoke execute on function get_cron_secret() from anon, authenticated;
grant execute on function get_cron_secret() to authenticated;

-- ----------------------------------------------------------------------------
-- Reschedule the jobs without the inlined secret
-- ----------------------------------------------------------------------------

create or replace function invoke_edge_function(p_function_name text)
returns void
language plpgsql
security definer
set search_path = public, vault, extensions
as $$
declare
  v_base_url text;
  v_secret text;
begin
  select decrypted_secret into v_base_url from vault.decrypted_secrets where name = 'functions_base_url';
  select decrypted_secret into v_secret from vault.decrypted_secrets where name = 'cron_secret';

  if v_base_url is null or v_secret is null then
    raise exception 'cron configuration missing from vault (functions_base_url / cron_secret)';
  end if;

  perform net.http_post(
    url := v_base_url || '/' || p_function_name,
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', v_secret)
  );
end;
$$;

revoke execute on function invoke_edge_function(text) from anon, authenticated;

select cron.unschedule('send-pending-emails');
select cron.unschedule('daily-reminders');
select cron.unschedule('process-dossier-activations');

select cron.schedule('send-pending-emails', '*/5 * * * *', $job$select invoke_edge_function('send-pending-emails')$job$);
select cron.schedule('daily-reminders', '0 7 * * *', $job$select invoke_edge_function('daily-reminders')$job$);
select cron.schedule('process-dossier-activations', '*/5 * * * *', $job$select invoke_edge_function('process-dossier-activations')$job$);

-- ----------------------------------------------------------------------------
-- 30-day purge of the soft-delete bin
-- ----------------------------------------------------------------------------

create or replace function purge_soft_deleted()
returns jsonb
language plpgsql
security definer
set search_path = public, storage
as $$
declare
  v_cutoff timestamptz := now() - interval '30 days';
  v_dossiers integer;
  v_documents integer;
  v_comments integer;
  v_objects integer;
begin
  -- Storage objects first: once the rows are gone, their paths are unrecoverable.
  with purged as (
    delete from storage.objects o
    using documents d
    where o.bucket_id = 'documents'
      and o.name = d.storage_path
      and (
        d.deleted_at <= v_cutoff
        or exists (select 1 from dossiers dd where dd.id = d.dossier_id and dd.deleted_at <= v_cutoff)
      )
    returning o.id
  )
  select count(*) into v_objects from purged;

  with purged as (
    delete from documents where deleted_at <= v_cutoff returning id
  )
  select count(*) into v_documents from purged;

  with purged as (
    delete from comments where deleted_at <= v_cutoff returning id
  )
  select count(*) into v_comments from purged;

  -- Children cascade from dossiers, so this also clears their tracking, answers,
  -- documents, comments, contracts and activity log.
  with purged as (
    delete from dossiers where deleted_at <= v_cutoff returning id
  )
  select count(*) into v_dossiers from purged;

  return jsonb_build_object(
    'dossiers', v_dossiers,
    'documents', v_documents,
    'comments', v_comments,
    'storageObjects', v_objects
  );
end;
$$;

revoke execute on function purge_soft_deleted() from anon, authenticated;

select cron.schedule('purge-soft-deleted', '30 3 * * *', $job$select purge_soft_deleted()$job$);
