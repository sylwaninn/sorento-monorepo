-- ============================================================================
-- Objecting to an activation used to be a dead end: the pending fields stayed set
-- forever, so request-dossier-activation answered "activation_already_pending" for
-- good and nobody could move the dossier on. Opposition now cancels the pending
-- activation and freezes further attempts until support lifts the freeze — which is
-- what "freeze the activation and notify support" actually requires.
-- ============================================================================

alter table dossiers
  add column activation_frozen_at timestamptz,
  add column activation_frozen_reason text;

-- Support-side release. Deliberately admin-only and deliberately an RPC: a frozen
-- activation means two relatives disagree about whether someone has died, and that is
-- not something a dossier member should be able to clear on their own.
create or replace function release_activation_freeze(p_dossier_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not is_admin() then
    raise exception 'forbidden';
  end if;

  update dossiers
  set activation_frozen_at = null,
      activation_frozen_reason = null
  where id = p_dossier_id;

  insert into activity_log (dossier_id, actor_id, action_type, target_id, details)
  values (p_dossier_id, auth.uid(), 'dossier_activated', null, jsonb_build_object('phase', 'freeze_released'));
end;
$$;

revoke execute on function release_activation_freeze(uuid) from anon;
