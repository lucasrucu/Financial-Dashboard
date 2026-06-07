import { NextResponse } from "next/server";

import { requireUser } from "@/lib/auth";
import {
  getCategoryData,
  getIncomeCategoryBreakdown,
  getMonthlySpendingComparison,
  getNetWorth,
} from "@/lib/aggregates";

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

    const [netWorth, spendingComparison, { topCategories, categoryBreakdown }, incomeBreakdown] =
      await Promise.all([
        getNetWorth(supabase),
        getMonthlySpendingComparison(supabase, monthOffset),
        getCategoryData(supabase, user.id, 3, monthOffset),
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
