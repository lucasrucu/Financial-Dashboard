import { NextResponse } from "next/server";

import { requireUser } from "@/lib/auth";
import { getBudgetProgress } from "@/lib/aggregates";

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
    const result = await getBudgetProgress(supabase, user.id, monthOffset);

    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch budget progress";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
