# Slack Bot Setup

This guide wires up the weekly check-in bot. Once done, every Friday at 5pm PT your department leads will get a Slack DM asking for their weekly update. They fill out a quick form, hit submit, and it flows straight into the tracker.

**Time to complete: ~30 minutes**

---

## What the bot does

| When | What happens |
|------|-------------|
| Friday 5pm PT | DM sent to each department lead with a check-in button |
| Sunday 11am PT | Reminder DM if they haven't submitted yet |
| Sunday 5pm PT | Final reminder — "closes in one hour" |
| Monday 9am PT | Weekly rollup summary posted (optional) |

---

## Step 1 — Create a Slack App

1. Go to **[api.slack.com/apps](https://api.slack.com/apps)**
2. Click **Create New App → From scratch**
3. Name it something like `MIT Tracker Bot`
4. Select your company's Slack workspace
5. Click **Create App**

---

## Step 2 — Set bot permissions

1. In the left sidebar click **OAuth & Permissions**
2. Scroll down to **Bot Token Scopes** and add these four scopes:

   | Scope | Why |
   |-------|-----|
   | `chat:write` | Send messages and DMs |
   | `im:write` | Open direct message conversations |
   | `users:read` | Look up users by ID |
   | `channels:read` | Read channel info |

3. Scroll back to the top and click **Install to Workspace**
4. Click **Allow**
5. Copy the **Bot User OAuth Token** — it starts with `xoxb-`. Save it somewhere.

---

## Step 3 — Get your Signing Secret

1. In the left sidebar click **Basic Information**
2. Scroll to **App Credentials**
3. Click **Show** next to Signing Secret
4. Copy it. Save it alongside your Bot Token.

---

## Step 4 — Enable Interactivity (for the check-in form)

1. In the left sidebar click **Interactivity & Shortcuts**
2. Toggle **Interactivity** to **On**
3. In the **Request URL** field, paste:
   ```
   https://YOUR_PROJECT_REF.supabase.co/functions/v1/slack-checkin-handler
   ```
   Replace `YOUR_PROJECT_REF` with your Supabase project ref (found in Supabase → Settings → General).
4. Click **Save Changes**

---

## Step 5 — Store secrets in Supabase

Open your terminal in the project folder and run:

```bash
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
```

Then set your secrets (replace the placeholder values):

```bash
npx supabase secrets set SLACK_BOT_TOKEN=xoxb-your-token-here
npx supabase secrets set SLACK_SIGNING_SECRET=your-signing-secret-here
```

> **Never put these values in code or `.env` files.** Supabase secrets are stored securely server-side.

---

## Step 6 — Deploy the edge functions

```bash
npx supabase functions deploy slack-send-checkins
npx supabase functions deploy slack-send-reminder
npx supabase functions deploy slack-checkin-handler
npx supabase functions deploy slack-monday-summary
```

---

## Step 7 — Set up the cron schedule

1. Go to your **Supabase dashboard → SQL Editor**
2. Open `supabase/slack_cron.sql` from this repo
3. Replace the two placeholders at the top of that file:
   - `YOUR_PROJECT_REF` → your Supabase project ref
   - `YOUR_SERVICE_ROLE_KEY` → from Supabase → Settings → API → Service role key
4. Paste the entire file into the SQL Editor and click **Run**

You should see 4 cron jobs created. Verify by running:
```sql
select jobname, schedule, active from cron.job;
```

---

## Step 8 — Add team leads in the app

1. Log in to your deployed app
2. Go to **Setup** in the sidebar
3. For each department, add the lead's name and their **Slack Member ID**

**How to find a Slack Member ID:**
1. Click on the person's name in Slack
2. Click their profile photo to open their full profile
3. Click the **⋯** (more) button
4. Click **Copy member ID**

It will look like `U04MB71FCAZ`.

> **Note:** The department whose lead is set as `adminDepartment` in `src/config.ts` is excluded from Slack — that person submits updates directly via the web app.

---

## Step 9 — Test it

Trigger a check-in DM manually to make sure everything is wired up:

```bash
npx supabase functions invoke slack-send-checkins
```

Each department lead should receive a DM within a few seconds with a **Submit Check-in** button. Have one person click it, fill out the form, and submit — then check the tracker dashboard to confirm the update appears.

---

## Timezone reference

All cron times are in UTC. The schedule assumes **Pacific Time (PT)**:

| Cron | UTC | PT |
|------|-----|----|
| Friday check-ins | `0 0 * * 6` (Sat 00:00 UTC) | Fri 5:00 PM PDT |
| Sunday morning reminder | `0 18 * * 0` | Sun 11:00 AM PDT |
| Sunday final reminder | `0 0 * * 1` (Mon 00:00 UTC) | Sun 5:00 PM PDT |
| Monday rollup | `0 16 * * 1` | Mon 9:00 AM PDT |

If your team is in a different timezone, update the cron expressions in `supabase/slack_cron.sql` before running it. Use [crontab.guru](https://crontab.guru) to build the right schedule.

---

## Troubleshooting

**DMs aren't sending**
- Check that the Slack Member IDs in Setup are correct (they must start with `U`)
- Verify secrets are set: `npx supabase secrets list`
- Check function logs: Supabase dashboard → Edge Functions → slack-send-checkins → Logs

**The check-in form doesn't open**
- Confirm the Interactivity Request URL in your Slack app matches your Supabase function URL exactly
- Redeploy the handler: `npx supabase functions deploy slack-checkin-handler`

**Submissions aren't showing in the dashboard**
- The department lead's Slack Member ID in Setup must match the one Slack sends in the interaction payload
- Check edge function logs for errors

**Cron jobs aren't firing**
- Run `select jobname, schedule, active from cron.job;` in Supabase SQL Editor to confirm jobs exist
- Make sure `pg_cron` and `pg_net` extensions are enabled: Supabase → Database → Extensions
