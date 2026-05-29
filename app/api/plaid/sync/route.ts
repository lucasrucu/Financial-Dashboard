import { NextResponse } from "next/server";

import { detectRecurringTransactions } from "@/lib/aggregates";
import { fetchAccounts, fetchTransactions } from "@/lib/plaid";
import { getSupabaseAdmin } from "@/lib/supabase";
import { mapPlaidCategory } from "@/lib/utils";

export async function POST() {
  try {
    const supabase = getSupabaseAdmin();

    const { data: plaidItem, error: itemError } = await supabase
      .from("plaid_items")
      .select("*")
      .neq("item_id", "bcp-manual")
      .order("last_synced_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (itemError) {
      throw new Error(itemError.message);
    }

    if (!plaidItem) {
      return NextResponse.json({ error: "No connected bank account" }, { status: 404 });
    }

    const accounts = await fetchAccounts(plaidItem.access_token);

    const { data: existingAccounts } = await supabase
      .from("accounts")
      .select("plaid_account_id, balance_anchor_usd")
      .in(
        "plaid_account_id",
        accounts.map((account) => account.plaid_account_id)
      );

    const anchoredAccountIds = new Set(
      (existingAccounts ?? [])
        .filter((account) => account.balance_anchor_usd !== null)
        .map((account) => account.plaid_account_id)
    );

    for (const account of accounts) {
      const upsertPayload: {
        plaid_account_id: string;
        plaid_item_id: string;
        name: string;
        balance_usd?: number;
        mask: string | null;
        subtype: string | null;
      } = {
        plaid_account_id: account.plaid_account_id,
        plaid_item_id: plaidItem.id,
        name: account.name,
        mask: account.mask,
        subtype: account.subtype,
      };

      if (!anchoredAccountIds.has(account.plaid_account_id)) {
        upsertPayload.balance_usd = account.balance_usd;
      }

      const { error: accountError } = await supabase
        .from("accounts")
        .upsert(upsertPayload, { onConflict: "plaid_account_id" });

      if (accountError) {
        throw new Error(accountError.message);
      }
    }

    const transactions = await fetchTransactions(plaidItem.access_token, 90);
    const recurringFlags = detectRecurringTransactions(transactions);

    const { data: accountRows } = await supabase
      .from("accounts")
      .select("id, plaid_account_id");

    const accountMap = new Map(
      (accountRows ?? []).map((account) => [account.plaid_account_id, account.id])
    );

    for (let index = 0; index < transactions.length; index += 1) {
      const transaction = transactions[index];
      const accountId = accountMap.get(transaction.plaid_account_id);

      if (!accountId) {
        continue;
      }

      await supabase.from("transactions").upsert(
        {
          plaid_transaction_id: transaction.plaid_transaction_id,
          account_id: accountId,
          date: transaction.date,
          name: transaction.name,
          amount_usd: transaction.amount_usd,
          category_id: mapPlaidCategory(transaction.plaid_category),
          plaid_category: transaction.plaid_category,
          is_recurring: recurringFlags[index] ?? false,
        },
        { onConflict: "plaid_transaction_id" }
      );
    }

    const syncedAt = new Date().toISOString();

    await supabase
      .from("plaid_items")
      .update({ last_synced_at: syncedAt })
      .eq("id", plaidItem.id);

    return NextResponse.json({
      synced_at: syncedAt,
      transaction_count: transactions.length,
      account_count: accounts.length,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to sync transactions";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
