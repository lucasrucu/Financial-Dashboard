import { NextResponse } from "next/server";

import { requireUser } from "@/lib/auth";
import { analyzeFinances } from "@/lib/anthropic";
import { buildAiAnalysisPayload } from "@/lib/aggregates";

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

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
