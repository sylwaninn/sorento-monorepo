-- ============================================================================
-- Email delivery bookkeeping. A send that failed used to stay 'pending' with no
-- attempt counter, so a dead address was retried every five minutes forever.
-- ============================================================================

alter table notifications
  add column email_attempts integer not null default 0,
  add column email_last_attempt_at timestamptz;

alter table notifications drop constraint notifications_email_status_check;
alter table notifications add constraint notifications_email_status_check
  check (email_status in ('pending', 'sent', 'skipped', 'failed', 'not_applicable'));

-- The pending index has to follow the new status set.
drop index notifications_email_status_idx;
create index notifications_email_status_idx on notifications (email_status, created_at)
  where email_status = 'pending';
