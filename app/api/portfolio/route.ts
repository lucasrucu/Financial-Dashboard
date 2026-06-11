import { NextResponse } from "next/server";

import { requireUser } from "@/lib/auth";
import type { FidelityPortfolioData } from "@/types/fidelity";

export async function GET() {
  try {
    const auth = await requireUser();
    if (auth.unauthorized) {
      return auth.unauthorized;
    }

    const { data: snapshot, error: snapshotError } = await auth.supabase
      .from("portfolio_snapshots")
      .select("*")
      .eq("user_id", auth.user.id)
      .order("snapshot_date", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (snapshotError) {
      return NextResponse.json({ error: snapshotError.message }, { status: 500 });
    }

    if (!snapshot) {
      return NextResponse.json({ portfolio: null });
    }

    const { data: positions, error: positionsError } = await auth.supabase
      .from("stock_positions")
      .select("*")
      .eq("snapshot_id", snapshot.id)
      .eq("user_id", auth.user.id)
      .order("current_value_usd", { ascending: false });

    if (positionsError) {
      return NextResponse.json({ error: positionsError.message }, { status: 500 });
    }

    const portfolio: FidelityPortfolioData = {
      snapshot,
      positions: positions ?? [],
    };

    return NextResponse.json({ portfolio });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch portfolio";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
