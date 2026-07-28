-- Needed by process-dossier-activations to know which membership row to promote to
-- future_role once the grace period elapses (email alone isn't a stable join key).
alter table trusted_contact_designations
  add column consented_by uuid references profiles (id);
