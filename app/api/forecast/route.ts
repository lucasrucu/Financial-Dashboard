import { NextResponse } from "next/server";

import { requireUser } from "@/lib/auth";
import { getForecastData } from "@/lib/aggregates";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const auth = await requireUser();
    if (auth.unauthorized) {
      return auth.unauthorized;
    }

    const { searchParams } = new URL(request.url);
    const historyMonths = Math.min(
      Math.max(Number(searchParams.get("historyMonths") ?? "6"), 3),
      12
    );
    const projectionMonths = Math.min(
      Math.max(Number(searchParams.get("projectionMonths") ?? "3"), 1),
      6
    );

    const { supabase, user } = auth;
    const forecast = await getForecastData(
      supabase,
      user.id,
      historyMonths,
      projectionMonths
    );

    return NextResponse.json(forecast);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to build forecast";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
