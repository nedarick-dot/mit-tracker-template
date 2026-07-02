import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ── Update this date to match CONFIG.quarter.startDate ──
function getQuarterWeekAnchor(): Date {
  const qs = new Date("2026-07-01");
  const day = qs.getDay();
  const offset = day === 0 ? -6 : -(day - 1);
  qs.setDate(qs.getDate() + offset);
  return qs;
}

function getCurrentWeekNumber(): number {
  const anchor = getQuarterWeekAnchor();
  const diffDays = Math.floor((Date.now() - anchor.getTime()) / (1000 * 60 * 60 * 24));
  return Math.max(1, Math.min(Math.floor(diffDays / 7) + 1, 13));
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

    // Optional: target a specific week. Default = previous completed week.
    let targetWeek: number | null = null;
    try {
      const body = await req.json();
      if (typeof body?.week_number === "number") targetWeek = body.week_number;
    } catch {
      /* no body */
    }

    const currentWeek = getCurrentWeekNumber();
    const weekNumber = targetWeek ?? Math.max(1, currentWeek - 1);

    // Pull all department rollups for that week
    const { data: rollups, error: rollupsErr } = await supabase
      .from("weekly_rollups")
      .select("*")
      .eq("week_number", weekNumber);
    if (rollupsErr) throw rollupsErr;

    if (!rollups || rollups.length === 0) {
      return new Response(
        JSON.stringify({
          skipped: true,
          reason: `No department rollups found for week ${weekNumber}`,
          week_number: weekNumber,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // Build context for the AI: each department's look-back, look-ahead, MIT statuses
    const deptStatuses: Record<string, { status: string; summary: string | null }> = {};
    const sections: string[] = [];

    for (const r of rollups) {
      let parsed: any = null;
      try {
        parsed = r.status_assessment ? JSON.parse(r.status_assessment) : null;
      } catch {
        parsed = null;
      }
      const lb = parsed?.look_back || {};
      const la = parsed?.look_ahead || {};
      const mits: any[] = parsed?.mit_status || [];

      const overall = mits.some((m) => m.status === "blocked" || m.status === "red")
        ? "red"
        : mits.some((m) => m.status === "at_risk" || m.status === "yellow")
        ? "yellow"
        : mits.length > 0 && mits.every((m) => m.status === "complete" || m.status === "green")
        ? "green"
        : "yellow";

      deptStatuses[r.department || "Unknown"] = {
        status: overall,
        summary: lb.general_progress || r.summary || null,
      };

      sections.push(
        `### ${r.department}
General progress: ${lb.general_progress || "N/A"}
Key decisions: ${lb.key_decisions || "N/A"}
Areas of challenge: ${lb.areas_of_challenge || "N/A"}
Top priorities next: ${la.top_priorities || "N/A"}
Roadblocks: ${la.roadblocks_to_alleviate || "N/A"}
Upcoming decisions: ${la.upcoming_decisions || "N/A"}
MIT statuses: ${mits.map((m) => `${m.mit_title}=${m.status}`).join(", ") || "none"}`
      );
    }

    const systemPrompt = `You are an executive leadership rollup synthesizer for the Advisory Practice Q3 2026 MIT system.
Synthesize multiple department weekly rollups into a single executive snapshot. Be concise, evidence-based, and actionable. Do not invent activity not present in the source rollups.`;

    const userPrompt = `Synthesize the Week ${weekNumber} executive snapshot from these ${rollups.length} department rollups:

${sections.join("\n\n")}

Return a JSON object with this EXACT structure:
{
  "summary": "3-4 sentence executive summary of the week across all departments",
  "key_wins": "Bulleted list (use line breaks) of the most notable wins this week",
  "key_risks": "Bulleted list of the top risks, blockers, and at-risk items leadership should know about",
  "recommendations": "Bulleted list of concrete recommendations or asks for leadership"
}`;

    const aiRes = await fetch("https://api.anthropic.com/v1/messages", {
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

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      if (aiRes.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited. Try again in a moment." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`Anthropic API error: ${aiRes.status} ${errText}`);
    }

    const aiData = await aiRes.json();
    const raw = aiData.content?.[0]?.text || "{}";
    let jsonStr = raw;
    const fence = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fence) jsonStr = fence[1].trim();

    let parsed: any = {};
    try {
      parsed = JSON.parse(jsonStr);
    } catch {
      parsed = { summary: raw };
    }

    // Compute overall status from dept rollups
    const statuses = Object.values(deptStatuses).map((d) => d.status);
    const overall = statuses.includes("red")
      ? "red"
      : statuses.includes("yellow")
      ? "yellow"
      : "green";

    // Replace any existing snapshot for this week (delete then insert; UPDATE not policy-permitted)
    await supabase
      .from("executive_rollup_snapshots")
      .delete()
      .eq("week_number", weekNumber);

    const { data: inserted, error: insErr } = await supabase
      .from("executive_rollup_snapshots")
      .insert({
        week_number: weekNumber,
        snapshot_date: new Date().toISOString().split("T")[0],
        overall_status: overall,
        summary: parsed.summary || null,
        key_wins: parsed.key_wins || null,
        key_risks: parsed.key_risks || null,
        recommendations: parsed.recommendations || null,
        department_statuses: deptStatuses,
        generated_by: "ai",
      })
      .select()
      .single();

    if (insErr) throw insErr;

    return new Response(
      JSON.stringify({
        success: true,
        week_number: weekNumber,
        snapshot_id: inserted?.id,
        departments_aggregated: rollups.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (e) {
    console.error("generate-executive-snapshot error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
