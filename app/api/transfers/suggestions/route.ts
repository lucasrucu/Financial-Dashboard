import { NextResponse } from "next/server";

import { requireUser } from "@/lib/auth";
import { findTransferCandidates, type TransferLeg } from "@/lib/transfers";

export const dynamic = "force-dynamic";

const LOOKBACK_DAYS = 90;

export async function GET() {
  try {
    const auth = await requireUser();
    if (auth.unauthorized) {
      return auth.unauthorized;
    }

    const { supabase } = auth;

    const since = new Date(Date.now() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);

    const { data, error } = await supabase
      .from("transactions")
      .select("id, date, name, amount_usd, account_id, category_id, plaid_category, accounts(name)")
      .gte("date", since)
      .order("date", { ascending: false });

    if (error) {
      throw new Error(error.message);
    }

    const legs: TransferLeg[] = (data ?? []).map((row) => ({
      id: row.id as string,
      date: row.date as string,
      name: row.name as string,
      amount_usd: Number(row.amount_usd),
      account_id: row.account_id as string,
      account_name:
        (row.accounts as { name?: string } | null)?.name ?? "Unknown",
      category_id: row.category_id as string,
      plaid_category: (row.plaid_category as string[] | null) ?? null,
    }));

    const pairs = findTransferCandidates(legs);

    return NextResponse.json({ pairs });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to find transfer suggestions";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
