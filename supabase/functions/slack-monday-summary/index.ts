import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  CORS_HEADERS,
  slackApi,
  openDm,
  getCurrentWeekNumber,
  getWeekDates,
} from "../_shared/slack-utils.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS_HEADERS });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const SLACK_BOT_TOKEN = Deno.env.get("SLACK_BOT_TOKEN")!;

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const weekNumber = getCurrentWeekNumber();
  const { startStr, endStr } = getWeekDates(weekNumber);

  // Fetch Ned's Slack user ID
  const { data: ned } = await supabase
    .from("team_leads")
    .select("slack_user_id, name")
    .eq("is_ned", true)
    .maybeSingle();

  if (!ned?.slack_user_id) {
    return new Response(JSON.stringify({ error: "Ned's Slack user ID not configured" }), {
      status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  // Fetch all team leads (non-Ned)
  const { data: leads } = await supabase
    .from("team_leads")
    .select("*")
    .not("slack_user_id", "is", null)
    .eq("is_ned", false);

  const totalLeads = leads?.length || 0;

  // Determine who submitted
  const checkedIn: string[] = [];
  const missing: string[] = [];

  for (const lead of leads || []) {
    const { data: mitIds } = await supabase
      .from("department_mits")
      .select("id")
      .eq("department", lead.department);

    const { data: inputs } = await supabase
      .from("daily_inputs")
      .select("id")
      .in("department_mit_id", (mitIds || []).map((m: any) => m.id))
      .gte("input_date", startStr)
      .lte("input_date", endStr)
      .limit(1);

    if (inputs && inputs.length > 0) {
      checkedIn.push(lead.name);
    } else {
      missing.push(lead.name);
    }
  }

  // Current MIT health snapshot
  const { data: allMits } = await supabase
    .from("department_mits")
    .select("id, title, department, current_status");

  const atRisk = (allMits || []).filter((m: any) => m.current_status === "at_risk" || m.current_status === "blocked");

  // Open blockers
  const { data: openBlockers } = await supabase
    .from("blockers")
    .select("id, severity")
    .in("status", ["open", "in_progress"]);

  const criticalBlockers = (openBlockers || []).filter((b: any) => b.severity === "critical" || b.severity === "high");

  // Build Slack message blocks
  const statusLine = checkedIn.length === totalLeads
    ? `✅ All ${totalLeads} directors checked in`
    : `${checkedIn.length}/${totalLeads} directors checked in`;

  const blocks: object[] = [
    {
      type: "header",
      text: { type: "plain_text", text: `Week ${weekNumber} Check-in Summary`, emoji: true },
    },
    {
      type: "section",
      fields: [
        { type: "mrkdwn", text: `*Check-ins*\n${statusLine}` },
        { type: "mrkdwn", text: `*MITs at Risk/Blocked*\n${atRisk.length > 0 ? `🔴 ${atRisk.length} MIT${atRisk.length !== 1 ? "s" : ""}` : "✅ None"}` },
      ],
    },
  ];

  if (missing.length > 0) {
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: `⚠️ *Missing check-ins:* ${missing.join(", ")}`,
      },
    });
  }

  if (atRisk.length > 0) {
    const atRiskLines = atRisk.slice(0, 5).map((m: any) =>
      `• ${m.department} · ${m.title} — _${m.current_status}_`
    ).join("\n");
    blocks.push({
      type: "section",
      text: { type: "mrkdwn", text: `*Flagged MITs:*\n${atRiskLines}` },
    });
  }

  if (criticalBlockers.length > 0) {
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: `🚨 *${criticalBlockers.length} critical/high blocker${criticalBlockers.length !== 1 ? "s" : ""} open* — review on the Blockers page before the meeting.`,
      },
    });
  }

  blocks.push({ type: "divider" });
  blocks.push({
    type: "context",
    elements: [{ type: "mrkdwn", text: `Tuesday meeting at 1:30 pm PT · Pull up the Tuesday view before the call` }],
  });

  const dmChannel = await openDm(ned.slack_user_id, SLACK_BOT_TOKEN);
  if (dmChannel) {
    await slackApi("chat.postMessage", SLACK_BOT_TOKEN, {
      channel: dmChannel,
      text: `Week ${weekNumber} summary: ${checkedIn.length}/${totalLeads} checked in, ${atRisk.length} MITs flagged`,
      blocks,
    });
  }

  return new Response(
    JSON.stringify({ week_number: weekNumber, checked_in: checkedIn.length, missing: missing.length }),
    { headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
  );
});
