-- ----------------------------------------------------------------------------
-- catalog_history: automatic audit trail for every catalog write (step 11).
-- The table itself was created in the initial schema; only the trigger wiring
-- was missing, so every admin edit to procedures/benefits/conditions/letter_templates
-- is now traced without relying on application code to remember to log it.
-- ----------------------------------------------------------------------------

-- Nullable: seed.sql populates the catalog outside any authenticated session (no
-- auth.uid()), which is bootstrap data, not an admin edit: null means "system".
alter table catalog_history alter column modified_by drop not null;

create or replace function log_catalog_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into catalog_history (catalog_table, row_id, action, old_content, new_content, modified_by)
  values (
    TG_TABLE_NAME,
    coalesce(NEW.id, OLD.id),
    case TG_OP when 'INSERT' then 'created' when 'UPDATE' then 'updated' else 'deleted' end,
    case when TG_OP = 'INSERT' then null else to_jsonb(OLD) end,
    case when TG_OP = 'DELETE' then null else to_jsonb(NEW) end,
    auth.uid()
  );
  return coalesce(NEW, OLD);
end;
$$;

create trigger trg_procedures_catalog_history
  after insert or update or delete on procedures
  for each row execute function log_catalog_change();

create trigger trg_benefits_catalog_history
  after insert or update or delete on benefits
  for each row execute function log_catalog_change();

create trigger trg_conditions_catalog_history
  after insert or update or delete on conditions
  for each row execute function log_catalog_change();

create trigger trg_letter_templates_catalog_history
  after insert or update or delete on letter_templates
  for each row execute function log_catalog_change();

-- ----------------------------------------------------------------------------
-- get_admin_metrics: anonymized aggregate counts only. Runs as security definer
-- to count across all dossiers, but never returns a row, a name, or any single
-- dossier's content: only totals. CLAUDE.md forbids the admin any access to
-- dossier/tracking/comment/document content; this function is the one exception,
-- deliberately scoped to counts.
-- ----------------------------------------------------------------------------

create or replace function get_admin_metrics()
returns jsonb
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  result jsonb;
begin
  if not is_admin() then
    raise exception 'forbidden';
  end if;

  select jsonb_build_object(
    'totalUsers', (select count(*) from profiles),
    'totalDossiers', (select count(*) from dossiers where deleted_at is null),
    'dossiersByStatus', (
      select coalesce(jsonb_object_agg(status, dossier_count), '{}'::jsonb)
      from (
        select status, count(*) as dossier_count
        from dossiers
        where deleted_at is null
        group by status
      ) s
    ),
    'activeTrustedContactDesignations', (
      select count(*) from trusted_contact_designations where revoked_at is null
    ),
    'trackingCompletionRatePercent', (
      select case when count(*) = 0 then 0
        else round(100.0 * count(*) filter (where status = 'done') / count(*), 1)
      end
      from tracking
    ),
    'activeCatalogProcedures', (select count(*) from procedures where active),
    'activeCatalogBenefits', (select count(*) from benefits where active)
  ) into result;

  return result;
end;
$$;
