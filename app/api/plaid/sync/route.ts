import { NextResponse } from "next/server";

import { requireUser } from "@/lib/auth";
import { syncPlaidAccounts, syncPlaidTransactions } from "@/lib/plaid/sync-helpers";

export async function POST() {
  try {
    const auth = await requireUser();
    if (auth.unauthorized) {
      return auth.unauthorized;
    }

    const { supabase, user } = auth;

    const { data: plaidItem, error: itemError } = await supabase
      .from("plaid_items")
      .select("id, access_token")
      .not("item_id", "like", "bcp-manual%")
      .order("last_synced_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (itemError) {
      throw new Error(itemError.message);
    }

    if (!plaidItem) {
      return NextResponse.json({ error: "No connected bank account" }, { status: 404 });
    }

    const accounts = await syncPlaidAccounts(
      supabase,
      plaidItem.access_token,
      plaidItem.id,
      user.id
    );
    const transactionCount = await syncPlaidTransactions(
      supabase,
      plaidItem.access_token,
      user.id,
      90
    );

    const syncedAt = new Date().toISOString();

    await supabase
      .from("plaid_items")
      .update({ last_synced_at: syncedAt })
      .eq("id", plaidItem.id);

    return NextResponse.json({
      synced_at: syncedAt,
      transaction_count: transactionCount,
      account_count: accounts.length,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to sync transactions";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
