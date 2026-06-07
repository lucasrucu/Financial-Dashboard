import { NextResponse } from "next/server";

import { requireUser } from "@/lib/auth";
import {
  getCategoryData,
  getIncomeCategoryBreakdown,
  getMonthlySpendingComparison,
  getNetWorth,
} from "@/lib/aggregates";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const auth = await requireUser();
    if (auth.unauthorized) {
      return auth.unauthorized;
    }

    const { supabase, user } = auth;

    const [netWorth, spendingComparison, { topCategories, categoryBreakdown }, incomeBreakdown] =
      await Promise.all([
        getNetWorth(supabase),
        getMonthlySpendingComparison(supabase),
        getCategoryData(supabase, user.id, 3),
        getIncomeCategoryBreakdown(supabase, user.id),
      ]);

    return NextResponse.json({
      netWorth,
      spendingComparison,
      topCategories,
      categoryBreakdown,
      incomeBreakdown,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch overview stats";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
