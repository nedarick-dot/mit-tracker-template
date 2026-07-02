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

  let final = false;
  try {
    const body = await req.json();
    if (body?.final === true) final = true;
  } catch { /* no body */ }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const weekNumber = getCurrentWeekNumber();
  const { startStr, endStr } = getWeekDates(weekNumber);

  const { data: leads } = await supabase
    .from("team_leads")
    .select("*")
    .not("slack_user_id", "is", null)
    .eq("is_ned", false);

  if (!leads || leads.length === 0) {
    return new Response(JSON.stringify({ message: "No team leads" }), {
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  const reminded: string[] = [];

  for (const lead of leads) {
    const { data: mitIds } = await supabase
      .from("department_mits")
      .select("id")
      .eq("department", lead.department);

    if (!mitIds?.length) continue;

    const { data: existing } = await supabase
      .from("daily_inputs")
      .select("id")
      .in("department_mit_id", mitIds.map((m: any) => m.id))
      .gte("input_date", startStr)
      .lte("input_date", endStr)
      .limit(1);

    if (existing && existing.length > 0) continue; // already submitted

    const dmChannel = await openDm(lead.slack_user_id, SLACK_BOT_TOKEN);
    if (!dmChannel) continue;

    const msgText = final
      ? `🚨 Final call: your Week ${weekNumber} check-in closes at 5pm PT today.`
      : `⏰ Heads up: your Week ${weekNumber} MIT check-in closes at 5pm PT today.`;
    const msgBody = final
      ? `🚨 *Final call, ${lead.name.split(" ")[0]}* — Week ${weekNumber} check-in closes *at 5pm PT today.*\n\nAfter that Ned runs the rollup without your update.`
      : `⏰ *Hey ${lead.name.split(" ")[0]}* — just a reminder your Week ${weekNumber} check-in closes *at 5pm PT today.*\n\nTakes about 5 minutes. Ned reviews Monday morning.`;

    await slackApi("chat.postMessage", SLACK_BOT_TOKEN, {
      channel: dmChannel,
      text: msgText,
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: msgBody,
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
              value: lead.slack_user_id,
            },
          ],
        },
      ],
    });

    reminded.push(lead.name);
  }

  return new Response(
    JSON.stringify({ week_number: weekNumber, reminded }),
    { headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
  );
});
