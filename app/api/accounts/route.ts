import { NextResponse } from "next/server";

import { requireUser } from "@/lib/auth";
import { enrichAccountsWithEffectiveBalance } from "@/lib/accountBalance";
import { safeNumber } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const auth = await requireUser();
    if (auth.unauthorized) {
      return auth.unauthorized;
    }

    const { supabase } = auth;

    const { data: plaidItem } = await supabase
      .from("plaid_items")
      .select("*")
      .not("item_id", "like", "bcp-manual%")
      .order("last_synced_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const { data: bcpItem } = await supabase
      .from("plaid_items")
      .select("*")
      .like("item_id", "bcp-manual%")
      .order("last_synced_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const { data: accounts, error } = await supabase
      .from("accounts")
      .select("*")
      .order("name");

    if (error) {
      throw new Error(error.message);
    }

    const mappedAccounts = await enrichAccountsWithEffectiveBalance(
      supabase,
      (accounts ?? []).map((account) => ({
        ...account,
        balance_usd: safeNumber(account.balance_usd),
        balance_anchor_usd:
          account.balance_anchor_usd === null ? null : safeNumber(account.balance_anchor_usd),
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
