import { NextResponse } from "next/server";

import { buildExchangeRateUrl, isRateFresh } from "@/lib/currency";
import { getSupabaseAdmin } from "@/lib/supabase";

const DEFAULT_RATE = 3.75;

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = getSupabaseAdmin();

    const { data: cachedRate } = await supabase
      .from("exchange_rates")
      .select("*")
      .order("fetched_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (cachedRate && isRateFresh(cachedRate.fetched_at)) {
      return NextResponse.json({
        usd_to_pen: Number(cachedRate.usd_to_pen),
        fetched_at: cachedRate.fetched_at,
        cached: true,
      });
    }

    const response = await fetch(buildExchangeRateUrl("USD", "PEN"), {
      next: { revalidate: 86400 },
    });

    if (!response.ok) {
      if (cachedRate) {
        return NextResponse.json({
          usd_to_pen: Number(cachedRate.usd_to_pen),
          fetched_at: cachedRate.fetched_at,
          cached: true,
          stale: true,
        });
      }

      return NextResponse.json({
        usd_to_pen: DEFAULT_RATE,
        fetched_at: new Date().toISOString(),
        cached: false,
        fallback: true,
      });
    }

    const payload = (await response.json()) as {
      rates?: { PEN?: number };
    };

    const usdToPen = payload.rates?.PEN ?? DEFAULT_RATE;
    const fetchedAt = new Date().toISOString();

    await supabase.from("exchange_rates").insert({
      usd_to_pen: usdToPen,
      fetched_at: fetchedAt,
    });

    return NextResponse.json({
      usd_to_pen: usdToPen,
      fetched_at: fetchedAt,
      cached: false,
    });
  } catch (error) {
    const supabase = getSupabaseAdmin();
    const { data: cachedRate } = await supabase
      .from("exchange_rates")
      .select("*")
      .order("fetched_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (cachedRate) {
      return NextResponse.json({
        usd_to_pen: Number(cachedRate.usd_to_pen),
        fetched_at: cachedRate.fetched_at,
        cached: true,
        stale: true,
      });
    }

    return NextResponse.json({
      usd_to_pen: DEFAULT_RATE,
      fetched_at: new Date().toISOString(),
      cached: false,
      fallback: true,
      warning:
        error instanceof Error ? error.message : "Failed to fetch exchange rate",
    });
  }
}
