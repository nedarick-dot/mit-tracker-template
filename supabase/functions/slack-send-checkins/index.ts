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

  let force = false;
  try {
    const body = await req.json();
    if (body?.force === true) force = true;
  } catch { /* no body */ }

  // Fetch all team leads who have a Slack user ID and are not Ned
  const { data: leads } = await supabase
    .from("team_leads")
    .select("*")
    .not("slack_user_id", "is", null)
    .eq("is_ned", false);

  if (!leads || leads.length === 0) {
    return new Response(JSON.stringify({ message: "No team leads configured" }), {
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  const results: { name: string; status: string }[] = [];

  for (const lead of leads) {
    // Check if they've already submitted this week
    const { data: existing } = await supabase
      .from("daily_inputs")
      .select("id")
      .in(
        "department_mit_id",
        (await supabase.from("department_mits").select("id").eq("department", lead.department)).data?.map((m: any) => m.id) || []
      )
      .gte("input_date", startStr)
      .lte("input_date", endStr)
      .limit(1);

    if (!force && existing && existing.length > 0) {
      results.push({ name: lead.name, status: "already_submitted" });
      continue;
    }

    // Count their MITs
    const { data: mits } = await supabase
      .from("department_mits")
      .select("id, title")
      .eq("department", lead.department);

    const mitCount = mits?.length || 0;

    const dmChannel = await openDm(lead.slack_user_id, SLACK_BOT_TOKEN);
    if (!dmChannel) {
      results.push({ name: lead.name, status: "dm_failed" });
      continue;
    }

    await slackApi("chat.postMessage", SLACK_BOT_TOKEN, {
      channel: dmChannel,
      text: `👋 Time for your Week ${weekNumber} MIT check-in!`,
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `👋 *Time for your Week ${weekNumber} check-in, ${lead.name.split(" ")[0]}!*\n\nYou have *${mitCount} MIT${mitCount !== 1 ? "s" : ""}* to update. Takes about 5 minutes.\n\n_Check-in closes Sunday at 11:59 pm._`,
          },
        },
        {
          type: "actions",
          elements: [
            {
              type: "button",
              text: { type: "plain_text", text: "Start Check-in →", emoji: true },
              style: "primary",
              action_id: "start_checkin",
              value: lead.id,
            },
          ],
        },
      ],
    });

    results.push({ name: lead.name, status: "sent" });
  }

  return new Response(
    JSON.stringify({ week_number: weekNumber, results }),
    { headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
  );
});
