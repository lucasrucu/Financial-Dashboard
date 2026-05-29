import { NextResponse } from "next/server";

import {
  getCategoryBreakdown,
  getMonthlySpendingComparison,
  getNetWorth,
  getTopCategories,
} from "@/lib/aggregates";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [netWorth, spendingComparison, topCategories, categoryBreakdown] =
      await Promise.all([
        getNetWorth(),
        getMonthlySpendingComparison(),
        getTopCategories(3),
        getCategoryBreakdown(),
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
