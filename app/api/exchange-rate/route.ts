import { NextResponse } from "next/server";

import { requireUser } from "@/lib/auth";
import { buildExchangeRateUrl, DEFAULT_USD_TO_PEN, isRateFresh } from "@/lib/currency";

const DEFAULT_RATE = DEFAULT_USD_TO_PEN;

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const auth = await requireUser();
    if (auth.unauthorized) {
      return auth.unauthorized;
    }

    const { supabase } = auth;

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
    try {
      const auth = await requireUser();
      if (!auth.unauthorized) {
        const { data: cachedRate } = await auth.supabase
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
      }
    } catch {
      // ignore nested auth errors
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
