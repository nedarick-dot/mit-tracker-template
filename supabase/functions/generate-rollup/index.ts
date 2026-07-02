import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ── Update this list to match your departments in src/config.ts ──
const VALID_DEPARTMENTS = ["Operations", "Workshops", "Client Success", "Sales", "Marketing", "Events", "RevOps", "Growth"];

// ── Update this date to match CONFIG.quarter.startDate ──
function getQuarterWeekAnchor(): Date {
  const qs = new Date("2026-07-01");
  const day = qs.getDay();
  const offset = day === 0 ? -6 : -(day - 1);
  qs.setDate(qs.getDate() + offset);
  return qs;
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

    // Parse optional department / week parameters
    let targetDepartment: string | null = null;
    let targetWeek: number | null = null;
    try {
      const body = await req.json();
      if (body?.department && VALID_DEPARTMENTS.includes(body.department)) {
        targetDepartment = body.department;
      }
      if (Number.isInteger(body?.week_number) && body.week_number >= 1 && body.week_number <= 13) {
        targetWeek = body.week_number;
      }
    } catch {
      // No body or invalid JSON — generate for all departments
    }

    // Determine current week
    const anchor = getQuarterWeekAnchor();
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - anchor.getTime()) / (1000 * 60 * 60 * 24));
    const weekNumber = targetWeek ?? Math.max(1, Math.min(Math.floor(diffDays / 7) + 1, 13));
    const weekStart = new Date(anchor.getTime() + (weekNumber - 1) * 7 * 24 * 60 * 60 * 1000);
    const weekEnd = new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000);
    const weekStartStr = weekStart.toISOString().split("T")[0];
    const weekEndStr = weekEnd.toISOString().split("T")[0];

    // Fetch daily inputs for this week
    const { data: inputs, error: inputsErr } = await supabase
      .from("daily_inputs")
      .select("*, department_mits(id, title, department, current_status, green_definition, yellow_definition, red_definition)")
      .gte("input_date", weekStartStr)
      .lte("input_date", weekEndStr);
    if (inputsErr) throw inputsErr;

    const { data: milestones } = await supabase
      .from("monthly_milestones")
      .select("*, department_mits(title, department)");
    const activeMonth = weekNumber <= 4 ? "July" : weekNumber <= 9 ? "August" : "September";
    const activeMilestones = (milestones || []).filter((m: any) => m.month === activeMonth);

    const { data: blockers } = await supabase
      .from("blockers")
      .select("*, department_mits(title, department)")
      .in("status", ["open", "in_progress"]);

    const { data: carryForwards } = await supabase
      .from("daily_inputs")
      .select("*, department_mits(id, title, department)")
      .eq("carry_forward", true)
      .lt("input_date", weekStartStr)
      .gte("input_date", new Date(weekStart.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0])
      .order("input_date", { ascending: false });

    // Group by department
    const byDept: Record<string, any[]> = {};
    for (const input of inputs || []) {
      const dept = (input as any).department_mits?.department || "Unknown";
      if (!byDept[dept]) byDept[dept] = [];
      byDept[dept].push(input);
    }
    const blockersByDept: Record<string, any[]> = {};
    for (const b of blockers || []) {
      const dept = (b as any).department_mits?.department || "Unknown";
      if (!blockersByDept[dept]) blockersByDept[dept] = [];
      blockersByDept[dept].push(b);
    }
    const cfByDept: Record<string, any[]> = {};
    for (const cf of carryForwards || []) {
      const dept = (cf as any).department_mits?.department || "Unknown";
      if (!cfByDept[dept]) cfByDept[dept] = [];
      cfByDept[dept].push(cf);
    }

    // Determine which departments to process
    const departments = targetDepartment
      ? [targetDepartment]
      : VALID_DEPARTMENTS.filter((d) => byDept[d] || blockersByDept[d] || cfByDept[d]);

    // Snapshot current MIT statuses into history before AI runs
    if (departments.length > 0) {
      const { data: mitsToSnapshot } = await supabase
        .from("department_mits")
        .select("id, current_status")
        .in("department", departments);

      if (mitsToSnapshot && mitsToSnapshot.length > 0) {
        await (supabase as any).from("mit_status_history").upsert(
          mitsToSnapshot.map((m: any) => ({
            department_mit_id: m.id,
            status: m.current_status || "not_started",
            week_number: weekNumber,
          })),
          { onConflict: "department_mit_id,week_number" }
        );
      }
    }

const systemPrompt = `You are an executive leadership rollup generator for the Advisory Practice Q3 2026 MIT execution system.
Your job: synthesize actual daily human inputs into a structured weekly leadership rollup for a SINGLE department.
- Be evidence-based: only reference work actually reported in the inputs.
- The team has MANUALLY set each MIT's status (Not Started, In Progress, At Risk, Blocked, Complete). RESPECT this manual status as the primary source of truth.
- Do NOT override or change the manual status. Use it as-is in your mit_status output.
- If you detect a mismatch between the manual status and the execution evidence, note it in the brief_update as a suggestion/flag, but keep the status value the team set.
- Do NOT invent progress or activities not present in the data.
- Be concise but actionable.`;

    // Delete existing rollups for targeted departments only
    for (const dept of departments) {
      await supabase.from("weekly_rollups").delete().eq("week_number", weekNumber).eq("department", dept);
    }

    const allMitStatuses: any[] = [];
    const deptSummaries: Record<string, any> = {};

    for (const dept of departments) {
      const deptInputs = byDept[dept] || [];
      const deptBlockers = blockersByDept[dept] || [];
      const deptCF = cfByDept[dept] || [];
      const deptMilestones = activeMilestones.filter((m: any) => m.department_mits?.department === dept);

      const mitGroups: Record<string, any[]> = {};
      for (const inp of deptInputs) {
        const mitTitle = (inp as any).department_mits?.title || "Unknown MIT";
        if (!mitGroups[mitTitle]) mitGroups[mitTitle] = [];
        mitGroups[mitTitle].push(inp);
      }

      const inputText = Object.entries(mitGroups)
        .map(([mit, inps]) => {
          const mitData = (inps[0] as any).department_mits;
          const manualStatus = mitData?.current_status || "not_started";
          const lines = inps.map((i: any) => {
            let line = `- ${i.author_name} (${i.input_date}): ${i.update_text}`;
            if (i.what_completed) line += `\n  ✅ Completed: ${i.what_completed}`;
            if (i.blockers) line += `\n  ⚠️ Blocker: ${i.blockers}`;
            if (i.key_decisions) line += `\n  🔑 Decision: ${i.key_decisions}`;
            if (i.notes) line += `\n  📝 Note: ${i.notes}`;
            if (i.carry_forward) line += `\n  ➡️ Carry forward`;
            return line;
          });
          return `### MIT: ${mit}\nTeam-Set Manual Status: ${manualStatus} (DO NOT CHANGE THIS — use it as the status value in your output)\nGreen Def: ${mitData?.green_definition || "N/A"}\nYellow Def: ${mitData?.yellow_definition || "N/A"}\nRed Def: ${mitData?.red_definition || "N/A"}\n\nDaily Inputs:\n${lines.join("\n")}`;
        })
        .join("\n\n");

      const milestoneCtx = deptMilestones.length
        ? `${activeMonth} Milestones:\n${deptMilestones.map((m: any) => `- ${m.department_mits?.title}: ${m.description} (status: ${m.status})`).join("\n")}`
        : "No milestones for this month.";

      const blockerCtx = deptBlockers.length
        ? deptBlockers.map((b: any) => `- [${b.severity?.toUpperCase()}] ${b.department_mits?.title}: ${b.description} (${b.status})`).join("\n")
        : "No open blockers.";

      const cfCtx = deptCF.length
        ? deptCF.map((cf: any) => `- ${cf.department_mits?.title}: "${cf.update_text}" (from ${cf.input_date})`).join("\n")
        : "None.";

      const userPrompt = `Generate the Week ${weekNumber} (${weekStartStr} to ${weekEndStr}) rollup for the **${dept}** department ONLY.

${deptInputs.length ? inputText : "⚠️ No daily inputs were submitted this week for this department. Note this clearly."}

${milestoneCtx}

Carry-Forward Items entering this week:
${cfCtx}

Open Blockers:
${blockerCtx}

Return a JSON object with this EXACT structure:
{
  "look_back": {
    "general_progress": "2-3 sentences on what moved forward based on inputs",
    "key_decisions": "Decisions made or executed (from key_decisions fields)",
    "areas_of_challenge": "Where progress stalled, blockers hit, or carry-forward accumulated"
  },
  "look_ahead": {
    "top_priorities": "Top focus for next week, including unresolved carry-forward",
    "roadblocks_to_alleviate": "Blockers or decisions needing leadership attention",
    "upcoming_decisions": "Decisions that need to be made soon"
  },
  "mit_status": [
    {
      "mit_title": "MIT title",
      "status": "USE THE EXACT MANUAL STATUS THE TEAM SET (not_started | in_progress | at_risk | blocked | complete). DO NOT change it.",
      "brief_update": "1-2 sentence evidence-based update. If the execution evidence contradicts the manual status, note the mismatch here as a flag."
    }
  ]
}`;

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
        if (aiResponse.status === 429) {
          return new Response(JSON.stringify({ error: "Rate limited. Try again in a moment." }), {
            status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        throw new Error(`Anthropic API error: ${aiResponse.status} ${errText}`);
      }

      const aiData = await aiResponse.json();
      const rawContent = aiData.content?.[0]?.text || "{}";

      let jsonStr = rawContent;
      const fenceMatch = rawContent.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (fenceMatch) jsonStr = fenceMatch[1].trim();

      let parsed: any;
      try { parsed = JSON.parse(jsonStr); } catch { parsed = { look_back: { general_progress: rawContent } }; }

      const lookBack = parsed.look_back || {};
      const mitStatus = (parsed.mit_status || []).map((m: any) => ({ ...m, department: dept }));
      allMitStatuses.push(...mitStatus);

      const structuredData = { look_back: lookBack, look_ahead: parsed.look_ahead || {}, mit_status: mitStatus };

      deptSummaries[dept] = {
        summary: lookBack.general_progress || null,
        status: mitStatus.length > 0
          ? (mitStatus.some((m: any) => m.status === "red") ? "red" : mitStatus.every((m: any) => m.status === "green") ? "green" : "yellow")
          : "yellow",
      };

      await supabase.from("weekly_rollups").insert({
        week_number: weekNumber,
        week_start: weekStartStr,
        week_end: weekEndStr,
        department: dept,
        summary: lookBack.general_progress || null,
        themes: lookBack.key_decisions || null,
        blockers_summary: lookBack.areas_of_challenge || null,
        status_assessment: JSON.stringify(structuredData),
        raw_ai_response: rawContent,
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        week_number: weekNumber,
        departments_covered: departments,
        inputs_processed: inputs?.length || 0,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("generate-rollup error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
