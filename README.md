# MIT Quarterly Tracker — Setup Guide

## What This Is

The MIT Quarterly Tracker is a plug-and-play web app for teams that want to track their Most Important Things each quarter, get AI-generated weekly rollups summarizing progress across departments, and optionally send automated Slack check-ins to team leads. It ships with a leadership dashboard showing RAG (Red/Amber/Green) status across all teams, a setup page for configuring MITs and owners without touching code, and a Supabase backend that handles auth and data storage.

---

## Prerequisites

Before you start, make sure you have the following:

- **Node.js 18+** — check with `node -v`. Download at [nodejs.org](https://nodejs.org).
- **A GitHub account** — free at [github.com](https://github.com).
- **A free Supabase account** — sign up at [supabase.com](https://supabase.com). No credit card required for the free tier.
- **A free Vercel account** — sign up at [vercel.com](https://vercel.com). The hobby tier is fine.
- **An Anthropic API key** — get one at [console.anthropic.com](https://console.anthropic.com). You'll need to add a payment method, but usage for weekly rollups is minimal (a few cents per week at most).
- **Optional: A Slack app** — only needed if you want automated Slack check-ins. See Step 7.

---

## Step 1: Fork & Clone the Repo

1. Go to the template repo on GitHub and click **Fork** in the top right. This creates your own copy.

2. Clone your fork to your local machine:

```bash
git clone https://github.com/YOUR_USERNAME/mit-tracker-template.git
cd mit-tracker-template
```

3. Install dependencies:

```bash
npm install
```

4. Confirm the dev server starts without errors:

```bash
npm run dev
```

You should see the app at `http://localhost:5173`. It won't work fully until you add your environment variables (Step 4), but the UI should load.

---

## Step 2: Edit `src/config.ts`

This file is the single source of truth for your app's identity and structure. You edit it once before deploying and rarely touch it again. Open `src/config.ts` and fill in each field:

### Field Reference

| Field | Type | What it controls |
|---|---|---|
| `appName` | string | The app's display name in the header and browser tab |
| `teamName` | string | Your organization or team name, shown on the dashboard |
| `quarter.label` | string | Short label for the current quarter, e.g. `"Q3 2026"` |
| `quarter.startDate` | string | ISO date string for the first day of the quarter |
| `quarter.endDate` | string | ISO date string for the last day of the quarter |
| `quarter.totalWeeks` | number | Total number of weeks in the quarter (usually 13) |
| `quarter.months` | string[] | Array of month names in the quarter, used for milestone tracking |
| `departments` | array | List of departments/teams. Each has a `name` (string) and `color` (hex or Tailwind color) |
| `adminDepartment` | string | The department name whose members get admin privileges (must match a `departments` entry exactly) |

### Filled-In Example

```ts
// src/config.ts

export const config = {
  appName: "MIT Tracker",
  teamName: "Acquisition.com AP",

  quarter: {
    label: "Q3 2026",
    startDate: "2026-07-01",
    endDate: "2026-09-30",
    totalWeeks: 13,
    months: ["July", "August", "September"],
  },

  departments: [
    { name: "Sales",     color: "#3B82F6" },  // blue
    { name: "Marketing", color: "#8B5CF6" },  // purple
    { name: "RevOps",    color: "#10B981" },  // green
    { name: "CS",        color: "#F59E0B" },  // amber
    { name: "Events",    color: "#EF4444" },  // red
    { name: "L1",        color: "#6366F1" },  // indigo
    { name: "L3",        color: "#EC4899" },  // pink
  ],

  adminDepartment: "RevOps",
};
```

A few things to watch out for:
- `adminDepartment` must be spelled exactly the same as the corresponding entry in `departments`. Capitalization matters.
- `quarter.startDate` and `quarter.endDate` should be in `YYYY-MM-DD` format.
- Colors can be any valid CSS color string — hex codes work best for consistency.

---

## Step 3: Set Up Supabase

### Create a New Project

1. Log in at [supabase.com](https://supabase.com) and click **New project**.
2. Give it a name (e.g., `mit-tracker-q3-2026`), choose a region close to your team, and set a strong database password. Save that password somewhere — you won't need it often, but you will need it if you ever connect a DB client directly.
3. Wait about 60 seconds for the project to provision.

### Run the Setup SQL

1. In your Supabase project dashboard, click **SQL Editor** in the left sidebar.
2. Click **New query**.
3. Open `supabase/setup.sql` from this repo, copy the entire contents, and paste it into the SQL editor.
4. Click **Run** (or press `Cmd+Enter` / `Ctrl+Enter`).

You should see a success message. This script creates all 8 tables, sets up the `updated_at` trigger, enables Row Level Security on every table, and applies policies so that authenticated users can read and write all data.

### Copy Your Project Credentials

1. In the left sidebar, go to **Project Settings** → **API**.
2. Copy the **Project URL** — it looks like `https://xxxxxxxxxxxx.supabase.co`.
3. Copy the **anon public** key — it's a long JWT string under "Project API keys".

You'll use both of these in the next step.

---

## Step 4: Set Environment Variables

In the root of the project, you'll find a file called `.env.example`. Copy it to create your local environment file:

```bash
cp .env.example .env.local
```

Open `.env.local` and fill in the three values:

```env
VITE_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_ANTHROPIC_API_KEY=sk-ant-api03-...
```

- `VITE_SUPABASE_URL` — the Project URL you copied from Supabase Settings → API.
- `VITE_SUPABASE_ANON_KEY` — the anon public key from the same page.
- `VITE_ANTHROPIC_API_KEY` — your API key from [console.anthropic.com](https://console.anthropic.com).

**Do not commit `.env.local` to Git.** It's already in `.gitignore`, but double-check before pushing.

Restart your dev server after adding the env vars:

```bash
npm run dev
```

---

## Step 5: Deploy to Vercel

1. Push your configured repo to GitHub if you haven't already:

```bash
git add src/config.ts
git commit -m "configure for Q3 2026"
git push origin main
```

2. Go to [vercel.com](https://vercel.com), click **Add New → Project**, and import your GitHub repo.

3. Vercel will auto-detect that this is a Vite project. The build settings should populate automatically:
   - **Framework Preset:** Vite
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`

4. Before clicking Deploy, expand the **Environment Variables** section and add the same three variables you put in `.env.local`:

```
VITE_SUPABASE_URL        = https://xxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY   = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_ANTHROPIC_API_KEY   = sk-ant-api03-...
```

5. Click **Deploy**. Vercel will build and deploy the app in about 60–90 seconds. You'll get a live URL like `https://mit-tracker-yourteam.vercel.app`.

Future pushes to `main` will automatically redeploy.

---

## Step 6: First Login

1. Go to your deployed app URL.
2. Click **Sign Up** and create an account with your email address. This first account becomes the initial admin.
3. Check your email for a confirmation link from Supabase and click it.
4. Log back in — you should now have access to the full app including the Setup and Dashboard pages.

### Inviting Your Team

To add other users:

1. Go to your Supabase project dashboard.
2. Click **Authentication** in the left sidebar, then **Users**.
3. Click **Invite user** and enter their email address.
4. They'll receive an email invite and can set their password through the link.

Repeat for each team member. Everyone who signs in through Supabase auth will have read/write access to all data per the RLS policies set up in Step 3.

---

## Step 7 (Optional): Slack Check-Ins

Automated Slack check-ins send a weekly DM to each team lead asking for their MIT status update. This feature requires:

1. A Slack app with appropriate bot token scopes (`chat:write`, `users:read`, and `im:write` at minimum).
2. Storing the Slack bot token as a secret in Supabase (not in Vite env vars — it runs server-side in a Supabase Edge Function).
3. Scheduling the edge function via a Supabase cron job or an external scheduler.

This is more involved than the core setup and is covered separately. See **SLACK_SETUP.md** — coming soon.

If you want Slack check-ins before that guide is ready, open a GitHub issue on the template repo and we'll prioritize it.

---

## Step 8: Enter Your MITs

Once you're logged in:

1. Navigate to the **Setup** page from the top nav.
2. Under **Company MITs**, add your top-level quarterly priorities (usually 3–5). These are the org-wide MITs that department MITs roll up to.
3. Under **Team Leads**, add each team lead's name, department, and (optionally) their Slack user ID if you plan to use check-ins later.
4. Under **Department MITs**, add each department's MITs. For each one, fill in:
   - **Title** — short name for the MIT
   - **Owner** — the person accountable
   - **MIT Statement** — one sentence: "By end of Q3, we will have..."
   - **Green / Yellow / Red definitions** — what each status level looks like concretely
   - **Monthly Milestones** — what "done" looks like at the end of each month
   - **Company MIT link** — which company-level MIT this rolls up to

Once MITs are entered, team leads can post daily/weekly updates through the **Updates** page, and the AI rollup will generate a narrative summary from those inputs each week.

---

## Troubleshooting

### The app loads but I get a "missing Supabase URL" error

Your environment variables aren't being picked up. Make sure:
- The file is named `.env.local` (not `.env` or `.env.local.txt`).
- Every variable starts with `VITE_` — Vite only exposes env vars with that prefix to the browser.
- You restarted the dev server after creating the file (`Ctrl+C`, then `npm run dev` again).
- On Vercel, confirm the env vars are set under **Project Settings → Environment Variables** and that you redeployed after adding them.

### Auth isn't working / I can't log in

- Check that Supabase email auth is enabled: **Authentication → Providers → Email** should be toggled on.
- If you're using a custom domain on Vercel, add it to Supabase's allowed redirect URLs: **Authentication → URL Configuration → Redirect URLs**. Add `https://your-domain.com/**`.
- If a user never got the invite email, check their spam folder, then try resending from the Supabase Users panel.

### AI rollups aren't generating / I get an API error

- Confirm `VITE_ANTHROPIC_API_KEY` is set correctly in both `.env.local` and Vercel's environment variables.
- Check that your Anthropic account has an active payment method and a non-zero credit balance at [console.anthropic.com](https://console.anthropic.com).
- Check the browser console for the specific error message. A 401 means the key is wrong or inactive. A 429 means you've hit a rate limit (unlikely for weekly rollups, but possible on the lowest tier).

### The SQL setup script failed partway through

Run the script again — all the `create table if not exists` statements are idempotent, so re-running is safe. If a specific statement fails, copy just that statement into a new SQL Editor query and run it in isolation to see the full error message. The most common cause is a duplicate policy name if you ran the script more than once on a project that had partial setup. You can drop and recreate policies manually, or just create a fresh Supabase project and run the script clean.
