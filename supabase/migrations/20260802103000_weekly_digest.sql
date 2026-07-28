-- Opt-in weekly progress summary (section 8.1). Monday morning, and only for the people
-- who explicitly switched it on: resolve_notification_preference defaults it to off.
select cron.schedule('weekly-digest', '0 8 * * 1', $job$select invoke_edge_function('weekly-digest')$job$);
