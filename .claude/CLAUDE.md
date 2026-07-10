You are helping a team configure and deploy their MIT (Most Important Things) quarterly tracker. If this looks like a first-time setup (no `.env.local`, no team leads added yet), follow the first-time setup flow below and walk the user through it step by step, confirming each step before moving to the next.

## First-time setup flow (in order)
1. Edit `src/config.ts` — team name, quarter dates, departments
2. Create a Supabase project → run `supabase/setup.sql` in the SQL Editor
3. Create `.env.local` with the Supabase URL and anon key
4. Connect the repo to Vercel → set environment variables → confirm first deploy
5. Log in to the live app → Setup page → add department leads and their Slack IDs
6. Follow `SLACK_SETUP.md` to wire up the Slack bot

For every step involving credentials, show the user exactly where to find them (dashboard path, field name). Don't assume familiarity with Supabase or Vercel.

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
- `quarter` — label, start/end dates, month names, totalWeeks
- `departments` — list with name + color (HSL values)
- `adminDepartment` — the one department that uses the web app instead of Slack

After changing `src/config.ts`, also update `VALID_DEPARTMENTS` in:
- `supabase/functions/generate-rollup/index.ts`
- And the quarter start date (`getQuarterWeekAnchor`) in both rollup functions

## Database
The database is set up by running `supabase/setup.sql` in the Supabase SQL Editor.
Key tables: `company_mits`, `department_mits`, `daily_inputs`, `weekly_rollups`, `executive_rollup_snapshots`, `team_leads`, `monthly_milestones`, `blockers`.

## Environment variables
```
VITE_SUPABASE_URL        # Supabase project URL
VITE_SUPABASE_ANON_KEY   # Supabase anon/public key
VITE_ANTHROPIC_API_KEY   # Anthropic API key (for AI rollups)
```
Set in `.env.local` for local dev. Set in the Vercel dashboard for production (Settings → Environment Variables).

## Secrets (never in code or .env files)
Slack secrets must be stored via `npx supabase secrets set` — they are stored server-side and never committed to git:
```
SLACK_BOT_TOKEN
SLACK_SIGNING_SECRET
```

## Deployment
Vercel auto-deploys on every push to `main`. The git commit author email must match the GitHub account email or Vercel will block the build. Fix with: `git config --global user.email "your@email.com"`
