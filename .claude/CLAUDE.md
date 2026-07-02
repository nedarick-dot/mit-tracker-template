You are helping a team configure and extend their MIT (Most Important Things) quarterly tracker.

## What this app is
A web app for tracking quarterly goals (MITs) across departments. Teams log weekly updates, get AI-generated rollups, and optionally send Slack check-in messages to department leads.

## Stack
- Vite + React 18 + TypeScript
- Shadcn UI + Tailwind CSS v3
- Supabase (PostgreSQL + auth + edge functions in Deno)
- Anthropic Claude for AI rollup generation
- Vercel for hosting

## Configuration
**All team-specific settings live in `src/config.ts`.** This is the first file to edit:
- `teamName` — shown in the header
- `quarter` — label, start/end dates, month names
- `departments` — list with name + color
- `adminDepartment` — the one department that uses the web app instead of Slack

After changing `src/config.ts`, also update `VALID_DEPARTMENTS` in:
- `supabase/functions/generate-rollup/index.ts`
- And the quarter start date (`getQuarterWeekAnchor`) in both rollup functions

## Database
The database is set up by running `supabase/setup.sql` in the Supabase SQL Editor.
Key tables: `company_mits`, `department_mits`, `daily_inputs`, `weekly_rollups`, `executive_rollup_snapshots`, `team_leads`, `monthly_milestones`, `blockers`.

## Environment variables
```
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
VITE_ANTHROPIC_API_KEY
```
Set in `.env.local` for local dev. Set in Vercel dashboard for production.

## Secrets (never in code)
Slack secrets must be stored via `npx supabase secrets set`, never hardcoded.

## Deployment
Vercel auto-deploys on every push to `main`. Make sure your git email matches your GitHub account or Vercel will block the build.
