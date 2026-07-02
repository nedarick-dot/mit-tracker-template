import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  CORS_HEADERS,
  verifySlackSignature,
  slackApi,
  openDm,
  buildMitModal,
  getCurrentWeekNumber,
  getWeekDates,
  getActiveMonth,
  getTodayIso,
} from "../_shared/slack-utils.ts";

const CONFIDENCE_STATUS: Record<string, string> = {
  confident: "in_progress",
  shaky: "at_risk",
  off_track: "blocked",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS_HEADERS });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const SLACK_BOT_TOKEN = Deno.env.get("SLACK_BOT_TOKEN")!;
  const SLACK_SIGNING_SECRET = Deno.env.get("SLACK_SIGNING_SECRET");

  const body = await req.text();

  // ── Slack URL verification challenge ────────────────────────
  if (req.headers.get("content-type")?.includes("application/json")) {
    try {
      const parsed = JSON.parse(body);
      if (parsed.type === "url_verification") {
        return new Response(JSON.stringify({ challenge: parsed.challenge }), {
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        });
      }
    } catch { /* not JSON */ }
  }

  // ── Verify Slack signature ───────────────────────────────────
  if (SLACK_SIGNING_SECRET) {
    const valid = await verifySlackSignature(req.headers, body, SLACK_SIGNING_SECRET);
    if (!valid) return new Response("Unauthorized", { status: 401 });
  }

  // ── Parse payload ────────────────────────────────────────────
  const params = new URLSearchParams(body);
  const payloadStr = params.get("payload");
  if (!payloadStr) return new Response("OK", { status: 200 });

  let payload: any;
  try { payload = JSON.parse(payloadStr); } catch { return new Response("OK", { status: 200 }); }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // ── Button click: start_checkin ──────────────────────────────
  if (payload.type === "block_actions") {
    const action = payload.actions?.[0];
    if (action?.action_id !== "start_checkin") return new Response("OK", { status: 200 });

    const slackUserId = payload.user?.id;
    const triggerId = payload.trigger_id;
    const leadId = action?.value;
    if (!slackUserId || !triggerId || !leadId) return new Response("OK", { status: 200 });

    // Fetch team lead record by row ID (supports multi-department leads like Jacob)
    const { data: lead } = await supabase
      .from("team_leads")
      .select("*")
      .eq("id", leadId)
      .eq("is_ned", false)
      .maybeSingle();

    if (!lead) return new Response("OK", { status: 200 });

    // Fetch their MITs
    const { data: mits } = await supabase
      .from("department_mits")
      .select("id, title, owner, department, current_status, mit_statement")
      .eq("department", lead.department);

    if (!mits || mits.length === 0) {
      const dmChannel = await openDm(slackUserId, SLACK_BOT_TOKEN);
      if (dmChannel) {
        await slackApi("chat.postMessage", SLACK_BOT_TOKEN, {
          channel: dmChannel,
          text: `No MITs are set up for ${lead.department} yet. Ask Ned to add them in the tracker.`,
        });
      }
      return new Response("OK", { status: 200 });
    }

    const weekNumber = getCurrentWeekNumber();
    const activeMonth = getActiveMonth(weekNumber);
    const mitIds = mits.map((m: any) => m.id);

    // Fetch milestone for first MIT
    const { data: milestone } = await supabase
      .from("monthly_milestones")
      .select("id, description")
      .eq("department_mit_id", mitIds[0])
      .eq("month", activeMonth)
      .maybeSingle();

    const modal = buildMitModal({
      mit: mits[0],
      milestone: milestone || null,
      mitIds,
      currentIndex: 0,
      weekNumber,
      department: lead.department,
      authorName: lead.name,
      slackUserId,
      activeMonth,
    });

    await slackApi("views.open", SLACK_BOT_TOKEN, { trigger_id: triggerId, view: modal });

    return new Response("OK", { status: 200 });
  }

  // ── Modal submission ─────────────────────────────────────────
  if (payload.type === "view_submission" && payload.view?.callback_id === "mit_checkin") {
    const state = payload.view.state?.values || {};

    let meta: any;
    try { meta = JSON.parse(payload.view.private_metadata || "{}"); } catch { meta = {}; }

    const { mit_ids, current_index, week_number, department, author_name, slack_user_id } = meta;
    if (!mit_ids?.length) return new Response(JSON.stringify({ response_action: "clear" }), {
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });

    const currentMitId = mit_ids[current_index];
    const idx = current_index;
    const updateText: string = state[`update_text_${idx}`]?.update_text_input?.value || "";
    const whatCompleted: string | null = state[`what_completed_${idx}`]?.what_completed_input?.value || null;
    const keyDecisions: string | null = state[`key_decisions_${idx}`]?.key_decisions_input?.value || null;
    const blockerText: string = state[`blocker_text_${idx}`]?.blocker_text_input?.value || "";
    const confidence: string | null = state[`confidence_${idx}`]?.confidence_input?.selected_option?.value || null;
    const carryForward: boolean = (state[`carry_forward_${idx}`]?.carry_forward_input?.selected_options || []).length > 0;

    const activeMonth = getActiveMonth(week_number);
    const { startStr, endStr } = getWeekDates(week_number);

    // Parallel: fetch milestone for current MIT + fetch next MIT data
    const nextIndex = current_index + 1;
    const isLast = nextIndex >= mit_ids.length;
    const nextMitId = !isLast ? mit_ids[nextIndex] : null;

    const [milestoneRes, nextMitRes, nextMilestoneRes] = await Promise.all([
      supabase
        .from("monthly_milestones")
        .select("id, description")
        .eq("department_mit_id", currentMitId)
        .eq("month", activeMonth)
        .maybeSingle(),
      nextMitId
        ? supabase.from("department_mits").select("id, title, owner, mit_statement").eq("id", nextMitId).maybeSingle()
        : Promise.resolve({ data: null }),
      nextMitId
        ? supabase.from("monthly_milestones").select("id, description").eq("department_mit_id", nextMitId).eq("month", activeMonth).maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

    const milestone = milestoneRes.data;

    // Write daily input + optional blocker + optional milestone status update
    await Promise.all([
      supabase.from("daily_inputs").insert({
        department_mit_id: currentMitId,
        author_name,
        update_text: updateText,
        what_completed: whatCompleted || null,
        key_decisions: keyDecisions || null,
        blockers: blockerText || null,
        notes: confidence ? `confidence:${confidence}` : null,
        carry_forward: carryForward,
        milestone_id: milestone?.id || null,
        input_date: getTodayIso(),
      } as any),
      blockerText.trim()
        ? supabase.from("blockers").insert({
            department_mit_id: currentMitId,
            description: blockerText.trim(),
            severity: "high",
            status: "open",
            reported_by: author_name,
          } as any)
        : Promise.resolve(),
      milestone && confidence
        ? supabase.from("monthly_milestones").update({ status: CONFIDENCE_STATUS[confidence] }).eq("id", milestone.id)
        : Promise.resolve(),
    ]);

    // If more MITs remain — update the modal with next MIT
    if (!isLast && nextMitRes.data) {
      const nextModal = buildMitModal({
        mit: nextMitRes.data,
        milestone: nextMilestoneRes.data || null,
        mitIds: mit_ids,
        currentIndex: nextIndex,
        weekNumber: week_number,
        department,
        authorName: author_name,
        slackUserId: slack_user_id,
        activeMonth,
      });
      return new Response(
        JSON.stringify({ response_action: "update", view: nextModal }),
        { headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }

    // All done — send a confirmation DM in the background
    const confirmDm = async () => {
      const dmChannel = await openDm(slack_user_id, SLACK_BOT_TOKEN);
      if (!dmChannel) return;
      await slackApi("chat.postMessage", SLACK_BOT_TOKEN, {
        channel: dmChannel,
        text: `✅ *Week ${week_number} check-in complete!*\n\nAll ${mit_ids.length} MIT${mit_ids.length !== 1 ? "s" : ""} logged. Ned will review Monday morning. See you next Friday 👋`,
      });
    };
    confirmDm(); // fire and forget

    return new Response(
      JSON.stringify({ response_action: "clear" }),
      { headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );
  }

  return new Response("OK", { status: 200 });
});
