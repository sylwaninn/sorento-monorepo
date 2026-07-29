-- ============================================================================
-- A benefit added from E16 ("Ajouter à mes démarches") must be trackable exactly
-- like a procedure. tracking now targets either a procedure or a benefit,
-- mutually exclusive, mirroring the conditions table's own procedure/benefit split.
-- ============================================================================

alter table tracking
  alter column procedure_id drop not null,
  add column benefit_id uuid references benefits (id) on delete restrict,
  add constraint tracking_target_unique check (
    (procedure_id is not null)::int + (benefit_id is not null)::int = 1
  );

alter table tracking drop constraint tracking_dossier_id_procedure_id_key;

create unique index tracking_unique_procedure on tracking (dossier_id, procedure_id) where procedure_id is not null;
create unique index tracking_unique_benefit on tracking (dossier_id, benefit_id) where benefit_id is not null;
