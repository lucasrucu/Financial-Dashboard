import { NextResponse } from "next/server";

import { requireUser } from "@/lib/auth";
import { analyzeFinances } from "@/lib/anthropic";
import { buildAiAnalysisPayload } from "@/lib/aggregates";

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

// Cap real Claude calls per user per rolling 24h to prevent token-burn from
// repeated "force" re-analysis. Each genuine analysis writes one ai_cache row,
// so counting recent rows approximates calls made.
const DAILY_ANALYSIS_LIMIT = 8;

export async function GET(request: Request) {
  try {
    const auth = await requireUser();
    if (auth.unauthorized) {
      return auth.unauthorized;
    }

    const { supabase, user } = auth;
    const { searchParams } = new URL(request.url);
    const force = searchParams.get("force") === "true";

    const { data: cached } = await supabase
      .from("ai_cache")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (
      cached &&
      !force &&
      Date.now() - new Date(cached.created_at).getTime() < CACHE_TTL_MS
    ) {
      return NextResponse.json({
        insight: cached.response_json,
        cached: true,
        created_at: cached.created_at,
        period: cached.period,
      });
    }

    // We're about to make a real Claude call — enforce the daily cap.
    const since = new Date(Date.now() - CACHE_TTL_MS).toISOString();
    const { count } = await supabase
      .from("ai_cache")
      .select("id", { count: "exact", head: true })
      .gte("created_at", since);

    if ((count ?? 0) >= DAILY_ANALYSIS_LIMIT) {
      return NextResponse.json(
        {
          error:
            "You've hit the daily limit for fresh AI analyses. Your most recent results are still available — try again tomorrow.",
        },
        { status: 429 }
      );
    }

    const payload = await buildAiAnalysisPayload(supabase, user.id);
    const insight = await analyzeFinances(payload);

    await supabase.from("ai_cache").insert({
      user_id: user.id,
      response_json: insight,
      period: payload.period,
    });

    return NextResponse.json({
      insight,
      cached: false,
      created_at: new Date().toISOString(),
      period: payload.period,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to analyze finances";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  return GET(request);
}
