-- Table privileges for the API roles.
--
-- Until now the schema declared none and relied on the blanket ALTER DEFAULT PRIVILEGES that
-- older Supabase images applied to the public schema. Newer images stopped granting everything
-- to anon and authenticated, so a database replayed from these migrations answered 42501
-- (insufficient_privilege) on every call, before RLS was ever consulted. A privilege the schema
-- needs is a privilege the schema states.
--
-- The grants below mirror the policies exactly: a table gets a command for a role when, and only
-- when, a policy for that command and that role exists. RLS stays the boundary that decides
-- which rows; these decide which verbs. There is deliberately no ALTER DEFAULT PRIVILEGES here:
-- a new table declares its own grants next to its own policies, in its own migration.

-- anon reads the catalog and nothing else. Every other table is invisible to it at the
-- privilege level, so an RLS mistake elsewhere cannot degrade into anonymous access.
GRANT SELECT ON public.procedures TO anon;
GRANT SELECT ON public.benefits TO anon;
GRANT SELECT ON public.conditions TO anon;
GRANT SELECT ON public.letter_templates TO anon;

-- Read-only for the caller: the entries are written by triggers and service_role.
GRANT SELECT ON public.activity_log TO authenticated;

-- No INSERT: a dossier is created by an Edge Function running as service_role.
GRANT SELECT, UPDATE ON public.dossiers TO authenticated;
GRANT SELECT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT, UPDATE ON public.invitations TO authenticated;
GRANT SELECT, UPDATE ON public.notifications TO authenticated;
GRANT SELECT, UPDATE ON public.trusted_contact_designations TO authenticated;

-- No DELETE: comments and documents are soft-deleted, which is an UPDATE.
GRANT SELECT, INSERT, UPDATE ON public.comments TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.documents TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.answers TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.tracking TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.preparation_wishes TO authenticated;

-- Append-only audit of the catalog: corrections are added, never rewritten.
GRANT SELECT, INSERT ON public.catalog_history TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.procedures TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.benefits TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.conditions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.letter_templates TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contracts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.memberships TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notification_preferences TO authenticated;

-- The Edge Functions run as service_role and bypass RLS, but still need the privileges.
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
