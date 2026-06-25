import { NextResponse } from "next/server";

import { requireUser } from "@/lib/auth";
import { getOverviewData } from "@/lib/aggregates";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const auth = await requireUser();
    if (auth.unauthorized) {
      return auth.unauthorized;
    }

    const { searchParams } = new URL(request.url);
    const monthOffset = Number(searchParams.get("monthOffset") ?? "0");

    const { supabase, user } = auth;

    const overview = await getOverviewData(supabase, user.id, monthOffset);

    return NextResponse.json(overview);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch overview stats";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
