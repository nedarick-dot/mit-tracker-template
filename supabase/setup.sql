-- Run this entire script in your Supabase SQL Editor to set up the database.
-- All CREATE TABLE statements use IF NOT EXISTS, so this script is safe to re-run.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Tables
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists company_mits (
  id uuid primary key default gen_random_uuid(),
  mit_number int not null,
  title text not null,
  description text,
  created_at timestamptz default now()
);

create table if not exists department_mits (
  id uuid primary key default gen_random_uuid(),
  department text not null,
  title text not null,
  owner text,
  mit_statement text,
  green_definition text,
  yellow_definition text,
  red_definition text,
  current_status text default 'not_started',
  company_mit_id uuid references company_mits(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists daily_inputs (
  id uuid primary key default gen_random_uuid(),
  department_mit_id uuid references department_mits(id) on delete cascade,
  update_text text not null,
  status text,
  input_date date not null default current_date,
  created_at timestamptz default now()
);

create table if not exists weekly_rollups (
  id uuid primary key default gen_random_uuid(),
  department text not null,
  week_number int not null,
  content text,
  generated_at timestamptz default now()
);

create table if not exists executive_rollup_snapshots (
  id uuid primary key default gen_random_uuid(),
  week_number int not null,
  summary text,
  overall_status text default 'yellow',
  generated_at timestamptz default now()
);

create table if not exists team_leads (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  department text not null,
  slack_user_id text,
  is_active boolean default true,
  created_at timestamptz default now()
);

create table if not exists monthly_milestones (
  id uuid primary key default gen_random_uuid(),
  department_mit_id uuid references department_mits(id) on delete cascade,
  month text not null,
  description text,
  status text default 'pending',
  created_at timestamptz default now()
);

create table if not exists blockers (
  id uuid primary key default gen_random_uuid(),
  department_mit_id uuid references department_mits(id) on delete cascade,
  description text not null,
  status text default 'open',
  created_at timestamptz default now(),
  resolved_at timestamptz
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. updated_at trigger
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger department_mits_updated_at
  before update on department_mits
  for each row execute function update_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Row Level Security
-- ─────────────────────────────────────────────────────────────────────────────

alter table company_mits enable row level security;
alter table department_mits enable row level security;
alter table daily_inputs enable row level security;
alter table weekly_rollups enable row level security;
alter table executive_rollup_snapshots enable row level security;
alter table team_leads enable row level security;
alter table monthly_milestones enable row level security;
alter table blockers enable row level security;

-- Allow authenticated users to read/write everything
create policy "auth_all_company_mits" on company_mits for all to authenticated using (true) with check (true);
create policy "auth_all_department_mits" on department_mits for all to authenticated using (true) with check (true);
create policy "auth_all_daily_inputs" on daily_inputs for all to authenticated using (true) with check (true);
create policy "auth_all_weekly_rollups" on weekly_rollups for all to authenticated using (true) with check (true);
create policy "auth_all_snapshots" on executive_rollup_snapshots for all to authenticated using (true) with check (true);
create policy "auth_read_team_leads" on team_leads for select to authenticated using (true);
create policy "auth_write_team_leads" on team_leads for all to authenticated using (true) with check (true);
create policy "auth_all_milestones" on monthly_milestones for all to authenticated using (true) with check (true);
create policy "auth_all_blockers" on blockers for all to authenticated using (true) with check (true);

-- Service role bypass (needed for edge functions)
create policy "service_all_company_mits" on company_mits for all to service_role using (true) with check (true);
create policy "service_all_department_mits" on department_mits for all to service_role using (true) with check (true);
create policy "service_all_daily_inputs" on daily_inputs for all to service_role using (true) with check (true);
create policy "service_all_weekly_rollups" on weekly_rollups for all to service_role using (true) with check (true);
create policy "service_all_snapshots" on executive_rollup_snapshots for all to service_role using (true) with check (true);
create policy "service_all_team_leads" on team_leads for all to service_role using (true) with check (true);
create policy "service_all_milestones" on monthly_milestones for all to service_role using (true) with check (true);
create policy "service_all_blockers" on blockers for all to service_role using (true) with check (true);
