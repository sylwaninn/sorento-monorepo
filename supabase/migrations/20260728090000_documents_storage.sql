-- ============================================================================
-- Storage bucket for dossier documents. Private bucket, RLS policies mirror
-- has_dossier_access via the first path segment ({dossier_id}/{category}/{uuid}.{ext}).
-- ============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('documents', 'documents', false, 10485760, array['application/pdf', 'image/jpeg', 'image/png']);

create policy documents_storage_select on storage.objects for select to authenticated
  using (bucket_id = 'documents' and has_dossier_access((storage.foldername(name))[1]::uuid, 'viewer'));

create policy documents_storage_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'documents' and has_dossier_access((storage.foldername(name))[1]::uuid, 'collaborator'));

-- No client-side delete policy: "supprimer" is a soft delete on the documents table row
-- (deleted_at). Real object removal happens via a service_role purge job after 30 days
-- (cron job, not built yet), never directly from the client.
