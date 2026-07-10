# Setting Up Your MIT Tracker

**How to use this file:**
Open this repo in Claude Code, then paste the block below as your first message. Claude Code will walk you through the entire setup — one step at a time, waiting for you to confirm each step before moving on.

---

## Paste this into Claude Code to get started:

```
I'm setting up the MIT Tracker for my team for the first time. 
Please walk me through the full setup from start to finish.

Wait for me to confirm each step is complete before moving to the next one. 
If a step requires me to navigate somewhere or copy a value, tell me exactly where to go and what to look for.

Here's what I know so far:
- My team name is: [YOUR TEAM NAME]
- The quarter we're tracking: [e.g. Q3 2026, July–September]
- My departments are: [list them, e.g. Sales, Marketing, Finance, HR]
- The department whose lead will use the web app (not Slack): [e.g. Finance]

Let's start with Step 1.
```

---

## What the setup covers

| Step | What you'll do | Time |
|------|---------------|------|
| 1 | Configure your team, quarter, and departments in `src/config.ts` | 5 min |
| 2 | Create a Supabase project and set up the database | 10 min |
| 3 | Create a `.env.local` file with your credentials | 2 min |
| 4 | Connect to Vercel and deploy the app | 10 min |
| 5 | Log in and add your team leads | 5 min |
| 6 | Set up the Slack bot (see `SLACK_SETUP.md`) | 30 min |

**Total: ~60 minutes** for a fully working app with a live Slack bot.

---

## Accounts you'll need before starting

Create these if you don't have them — all free:

- **GitHub** — [github.com](https://github.com) — you need this to fork the repo
- **Supabase** — [supabase.com](https://supabase.com) — your database and backend
- **Vercel** — [vercel.com](https://vercel.com) — hosts the web app
- **Anthropic** — [console.anthropic.com](https://console.anthropic.com) — for AI-generated weekly summaries
- **Slack** — your company workspace (you'll create a Slack app inside it)

---

## Before you open Claude Code

1. Fork this repo to your own GitHub account (click **Fork** in the top-right on GitHub)
2. Clone your fork to your computer
3. Open the cloned folder in Claude Code
4. Paste the prompt above

That's it — Claude Code handles the rest.

---

## Reference: what each credential does

| Credential | Where to find it | Used for |
|-----------|-----------------|----------|
| Supabase URL | Supabase → Settings → API | Connecting the app to your database |
| Supabase Anon Key | Supabase → Settings → API | Read/write from the browser |
| Anthropic API Key | console.anthropic.com → API Keys | Generating weekly AI rollup summaries |
| Slack Bot Token (`xoxb-...`) | Slack app → OAuth & Permissions | Sending DMs from the bot |
| Slack Signing Secret | Slack app → Basic Information | Verifying Slack requests are genuine |

The Slack credentials are set via terminal command (`npx supabase secrets set`) — they are never stored in files or committed to git.
