import { NextResponse } from "next/server";

import { analyzeFinances } from "@/lib/anthropic";
import { buildAiAnalysisPayload } from "@/lib/aggregates";
import { getSupabaseAdmin } from "@/lib/supabase";

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const force = searchParams.get("force") === "true";
    const supabase = getSupabaseAdmin();

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

    const payload = await buildAiAnalysisPayload();
    const insight = await analyzeFinances(payload);

    await supabase.from("ai_cache").insert({
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
