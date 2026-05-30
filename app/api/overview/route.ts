import { NextResponse } from "next/server";

import { requireUser } from "@/lib/auth";
import {
  getCategoryBreakdown,
  getMonthlySpendingComparison,
  getNetWorth,
  getTopCategories,
} from "@/lib/aggregates";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const auth = await requireUser();
    if (auth.unauthorized) {
      return auth.unauthorized;
    }

    const { supabase, user } = auth;

    const [netWorth, spendingComparison, topCategories, categoryBreakdown] =
      await Promise.all([
        getNetWorth(supabase),
        getMonthlySpendingComparison(supabase),
        getTopCategories(supabase, user.id, 3),
        getCategoryBreakdown(supabase, user.id),
      ]);

    return NextResponse.json({
      netWorth,
      spendingComparison,
      topCategories,
      categoryBreakdown,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch overview stats";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
