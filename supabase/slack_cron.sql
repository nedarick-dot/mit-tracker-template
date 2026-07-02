-- ─────────────────────────────────────────────────────────────────────────────
-- Slack Check-in Cron Jobs
-- Replace the two values below, then paste this entire file into
-- Supabase → SQL Editor and click Run.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Replace with your Supabase project ref (found in Settings → General)
\set project_ref 'YOUR_PROJECT_REF'

-- 2. Replace with your service role key (found in Settings → API)
\set service_role_key 'YOUR_SERVICE_ROLE_KEY'

-- Enable required extensions
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- ── Friday 5pm PT — Send weekly check-in DMs ─────────────────────────────────
select cron.schedule(
  'friday-checkin-dms',
  '0 0 * * 6',
  format($$
    select net.http_post(
      url := 'https://%s.supabase.co/functions/v1/slack-send-checkins',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer %s"}'::jsonb,
      body := '{}'::jsonb
    );
  $$, :'project_ref', :'service_role_key')
);

-- ── Sunday 11am PT — Morning reminder ────────────────────────────────────────
select cron.schedule(
  'sunday-morning-reminder',
  '0 18 * * 0',
  format($$
    select net.http_post(
      url := 'https://%s.supabase.co/functions/v1/slack-send-reminder',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer %s"}'::jsonb,
      body := '{}'::jsonb
    );
  $$, :'project_ref', :'service_role_key')
);

-- ── Sunday 5pm PT — Final reminder ───────────────────────────────────────────
select cron.schedule(
  'sunday-final-reminder',
  '0 0 * * 1',
  format($$
    select net.http_post(
      url := 'https://%s.supabase.co/functions/v1/slack-send-reminder',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer %s"}'::jsonb,
      body := '{"final": true}'::jsonb
    );
  $$, :'project_ref', :'service_role_key')
);

-- ── Monday 9am PT — Weekly rollup summary ────────────────────────────────────
select cron.schedule(
  'monday-rollup-summary',
  '0 16 * * 1',
  format($$
    select net.http_post(
      url := 'https://%s.supabase.co/functions/v1/slack-monday-summary',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer %s"}'::jsonb,
      body := '{}'::jsonb
    );
  $$, :'project_ref', :'service_role_key')
);

-- Verify jobs were created
select jobname, schedule, active from cron.job;
