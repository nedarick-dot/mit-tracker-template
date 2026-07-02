import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-shared-secret",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "GET") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const expected = Deno.env.get("NAVIGATOR_SHARED_SECRET");
  const provided = req.headers.get("x-shared-secret");
  if (!expected || !provided || provided !== expected) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const url = new URL(req.url);
  const weekParam = url.searchParams.get("week");
  const week = Number(weekParam);
  if (!weekParam || !Number.isInteger(week) || week < 1) {
    return new Response(
      JSON.stringify({ error: "Missing or invalid 'week' query param" }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data, error } = await supabase
      .from("weekly_rollups")
      .select("department, summary, themes, blockers_summary, status_assessment")
      .eq("week_number", week)
      .neq("department", "overall");

    if (error) throw error;

    const rollups = (data ?? []).map((r) => ({
      department: r.department,
      data: {
        summary: r.summary,
        themes: r.themes,
        blockers_summary: r.blockers_summary,
        status_assessment: r.status_assessment,
      },
    }));

    return new Response(JSON.stringify({ rollups }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("public-rollups error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
