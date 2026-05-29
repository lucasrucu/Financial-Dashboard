import { NextResponse } from "next/server";

import { enrichAccountsWithEffectiveBalance } from "@/lib/accountBalance";
import { getSupabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = getSupabaseAdmin();

    const { data: plaidItem } = await supabase
      .from("plaid_items")
      .select("*")
      .neq("item_id", "bcp-manual")
      .order("last_synced_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const { data: bcpItem } = await supabase
      .from("plaid_items")
      .select("*")
      .eq("item_id", "bcp-manual")
      .maybeSingle();

    const { data: accounts, error } = await supabase
      .from("accounts")
      .select("*")
      .order("name");

    if (error) {
      throw new Error(error.message);
    }

    const mappedAccounts = await enrichAccountsWithEffectiveBalance(
      (accounts ?? []).map((account) => ({
        ...account,
        balance_usd: Number(account.balance_usd),
        balance_anchor_usd:
          account.balance_anchor_usd === null ? null : Number(account.balance_anchor_usd),
        balance_anchor_date: account.balance_anchor_date,
      }))
    );

    return NextResponse.json({
      connected: Boolean(plaidItem) || Boolean(bcpItem),
      plaid_connected: Boolean(plaidItem),
      bcp_connected: Boolean(bcpItem),
      institution_name: plaidItem?.institution_name ?? bcpItem?.institution_name ?? null,
      last_synced_at:
        plaidItem?.last_synced_at ?? bcpItem?.last_synced_at ?? null,
      accounts: mappedAccounts,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch accounts";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
