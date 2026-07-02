import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const DEPARTMENTS = ["Operations", "Workshops", "L3", "Sales", "Marketing", "Events", "RevOps", "Growth"];

const STATUS_EMOJI: Record<string, string> = {
  complete: "🟢",
  in_progress: "🔵",
  at_risk: "🟡",
  blocked: "🔴",
  not_started: "⬜",
};

function getQuarterWeekAnchor(): Date {
  const qs = new Date("2026-07-01");
  const day = qs.getDay();
  const offset = day === 0 ? -6 : -(day - 1);
  qs.setDate(qs.getDate() + offset);
  return qs;
}

function formatDateRange(startStr: string, endStr: string): string {
  const start = new Date(startStr + "T00:00:00");
  const end = new Date(endStr + "T00:00:00");
  const opts: Intl.DateTimeFormatOptions = { month: "long", day: "numeric" };
  return `${start.toLocaleDateString("en-US", opts)} – ${end.toLocaleDateString("en-US", { ...opts, year: "numeric" })}`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!ANTHROPIC_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Missing required environment variables");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    let targetWeek: number | null = null;
    try {
      const body = await req.json();
      if (Number.isInteger(body?.week_number) && body.week_number >= 1 && body.week_number <= 13) {
        targetWeek = body.week_number;
      }
    } catch { /* no body */ }

    const anchor = getQuarterWeekAnchor();
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - anchor.getTime()) / (1000 * 60 * 60 * 24));
    const weekNumber = targetWeek ?? Math.max(1, Math.min(Math.floor(diffDays / 7) + 1, 13));
    const weekStart = new Date(anchor.getTime() + (weekNumber - 1) * 7 * 24 * 60 * 60 * 1000);
    const weekEnd = new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000);
    const weekStartStr = weekStart.toISOString().split("T")[0];
    const weekEndStr = weekEnd.toISOString().split("T")[0];
    const dateRange = formatDateRange(weekStartStr, weekEndStr);

    // ── Fetch all data ───────────────────────────────────────
    const [
      { data: inputs },
      { data: allMits },
      { data: blockers },
      { data: rollups },
    ] = await Promise.all([
      supabase
        .from("daily_inputs")
        .select("*, department_mits(id, title, department, current_status)")
        .gte("input_date", weekStartStr)
        .lte("input_date", weekEndStr),
      supabase
        .from("department_mits")
        .select("id, title, department, current_status, owner"),
      supabase
        .from("blockers")
        .select("*, department_mits(title, department)")
        .in("status", ["open", "in_progress"]),
      supabase
        .from("weekly_rollups")
        .select("department, summary, themes, blockers_summary")
        .eq("week_number", weekNumber),
    ]);

    // ── Build context for Claude ──────────────────────────────
    const mitsByDept = DEPARTMENTS.reduce((acc, d) => {
      acc[d] = (allMits || []).filter((m: any) => m.department === d);
      return acc;
    }, {} as Record<string, any[]>);

    const mitStatusTable = DEPARTMENTS.flatMap((dept) =>
      (mitsByDept[dept] || []).map((m: any) => `${dept} · ${m.title} — ${m.current_status || "not_started"}`)
    ).join("\n");

    const checkinSummary = (() => {
      if (!inputs || inputs.length === 0) return "No check-ins submitted this week.";
      const byMit: Record<string, any[]> = {};
      for (const inp of inputs) {
        const key = `${(inp as any).department_mits?.department} · ${(inp as any).department_mits?.title}`;
        if (!byMit[key]) byMit[key] = [];
        byMit[key].push(inp);
      }
      return Object.entries(byMit).map(([k, inps]) =>
        `${k}:\n${inps.map((i: any) => {
          let line = `  - ${i.update_text}`;
          if (i.what_completed) line += `\n    ✅ ${i.what_completed}`;
          if (i.blockers) line += `\n    ⚠️ ${i.blockers}`;
          if (i.key_decisions) line += `\n    🔑 ${i.key_decisions}`;
          return line;
        }).join("\n")}`
      ).join("\n\n");
    })();

    const blockerSummary = blockers && blockers.length > 0
      ? blockers.map((b: any) => `[${b.severity?.toUpperCase()}] ${b.department_mits?.department} · ${b.department_mits?.title}: ${b.description}`).join("\n")
      : "No open blockers.";

    const rollupSummary = rollups && rollups.length > 0
      ? rollups.map((r: any) => `${r.department}: ${r.summary || "No summary."}`).join("\n")
      : "No rollup summaries available yet.";

    // ── Call Claude ───────────────────────────────────────────
    const systemPrompt = `You are drafting Ned Arick's weekly update to his leader Evan at Acquisition.com Advisory Practice.
Ned is VP of Operations, AP. He leads 8 departments: Operations, Workshops, L3, Sales, Marketing, Events, RevOps, Growth.
Each department has MITs (Most Important Things) for the quarter.
Your job: synthesize what happened this week across the practice into a clear, specific, executive-ready update.
Be evidence-based — only pull from data provided. Be direct and specific, not generic.
If data is thin, say so honestly rather than fabricating progress.`;

    const userPrompt = `Generate Ned's Week ${weekNumber} update to Evan (${dateRange}).

CHECK-IN TEXT FROM TEAMS THIS WEEK:
${checkinSummary}

CURRENT MIT STATUS ACROSS ALL DEPARTMENTS:
${mitStatusTable}

OPEN BLOCKERS:
${blockerSummary}

AI ROLLUP SUMMARIES (already generated this week):
${rollupSummary}

Return a JSON object with this EXACT structure — be specific and evidence-based for each field:
{
  "what_happened": "2-3 sentence narrative of the week across all departments. What moved, what didn't, overall tone.",
  "wins": ["specific, named win 1", "specific win 2"],
  "problems_risks": ["specific problem or risk with context"],
  "decisions_made": ["decision that was made or executed this week"],
  "help_needed": ["specific ask for Evan's attention or escalation"],
  "priorities_next_week": ["top priority 1 with brief context", "top priority 2"]
}

Rules:
- wins = completed items, positive progress, milestones hit
- problems_risks = at-risk/blocked MITs, open blockers, stalled work
- decisions_made = key_decisions from check-ins, resolved blockers
- help_needed = blockers needing escalation, decisions above Ned's authority, resourcing gaps
- priorities_next_week = what most needs to move next week based on current status
- If a field has nothing to report, return ["Nothing to report this week."]`;

    const aiResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 2048,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      throw new Error(`Anthropic API error: ${aiResponse.status} ${errText}`);
    }

    const aiData = await aiResponse.json();
    const rawContent = aiData.content?.[0]?.text || "{}";
    let jsonStr = rawContent;
    const fenceMatch = rawContent.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fenceMatch) jsonStr = fenceMatch[1].trim();

    let parsed: any;
    try { parsed = JSON.parse(jsonStr); } catch { parsed = {}; }

    const wins: string[] = parsed.wins || [];
    const problems: string[] = parsed.problems_risks || [];
    const decisions: string[] = parsed.decisions_made || [];
    const helpNeeded: string[] = parsed.help_needed || [];
    const priorities: string[] = parsed.priorities_next_week || [];

    // ── Build Slack message ───────────────────────────────────
    const bullets = (items: string[]) => items.map((i) => `• ${i}`).join("\n");

    const mitLines = DEPARTMENTS.flatMap((dept) =>
      (mitsByDept[dept] || []).map((m: any) => {
        const emoji = STATUS_EMOJI[m.current_status] || "⬜";
        return `${emoji}  *${dept}* · ${m.title}`;
      })
    );

    const slackMessage = [
      `*Advisory Practice — Week ${weekNumber} Update*`,
      dateRange,
      "",
      "*What Happened This Week*",
      parsed.what_happened || "_No summary generated._",
      "",
      "*✅ Wins*",
      bullets(wins),
      "",
      "*⚠️ Problems & Risks*",
      bullets(problems),
      "",
      "*🔑 Decisions Made*",
      bullets(decisions),
      "",
      "*🙋 Help Needed*",
      bullets(helpNeeded),
      "",
      "*🎯 Top Priorities Next Week*",
      bullets(priorities),
      "",
      "──────────────────────",
      "*MIT Status Snapshot*",
      "",
      ...mitLines,
    ].join("\n");

    return new Response(
      JSON.stringify({
        week_number: weekNumber,
        date_range: dateRange,
        narrative: {
          what_happened: parsed.what_happened || null,
          wins,
          problems_risks: problems,
          decisions_made: decisions,
          help_needed: helpNeeded,
          priorities_next_week: priorities,
        },
        mit_table: DEPARTMENTS.flatMap((dept) =>
          (mitsByDept[dept] || []).map((m: any) => ({
            department: dept,
            title: m.title,
            owner: m.owner,
            status: m.current_status || "not_started",
          }))
        ),
        slack_message: slackMessage,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("generate-evan-report error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
