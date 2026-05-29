import { NextResponse } from "next/server";

import {
  exchangePublicToken,
  fetchAccounts,
  fetchTransactions,
  getInstitutionName,
} from "@/lib/plaid";
import { detectRecurringTransactions } from "@/lib/aggregates";
import { getSupabaseAdmin } from "@/lib/supabase";
import { mapPlaidCategory } from "@/lib/utils";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { public_token?: string };

    if (!body.public_token) {
      return NextResponse.json({ error: "Missing public_token" }, { status: 400 });
    }

    const { accessToken, itemId } = await exchangePublicToken(body.public_token);
    const institutionName = await getInstitutionName(accessToken);
    const supabase = getSupabaseAdmin();

    const { data: existingItem } = await supabase
      .from("plaid_items")
      .select("id")
      .eq("item_id", itemId)
      .maybeSingle();

    let plaidItemId = existingItem?.id;

    if (plaidItemId) {
      await supabase
        .from("plaid_items")
        .update({
          access_token: accessToken,
          institution_name: institutionName,
        })
        .eq("id", plaidItemId);
    } else {
      const { data: insertedItem, error: insertError } = await supabase
        .from("plaid_items")
        .insert({
          access_token: accessToken,
          item_id: itemId,
          institution_name: institutionName,
        })
        .select("id")
        .single();

      if (insertError || !insertedItem) {
        throw new Error(insertError?.message ?? "Failed to save Plaid item");
      }

      plaidItemId = insertedItem.id;
    }

    const accounts = await fetchAccounts(accessToken);

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
        plaid_item_id: plaidItemId,
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

    const transactions = await fetchTransactions(accessToken, 90);
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

    await supabase
      .from("plaid_items")
      .update({ last_synced_at: new Date().toISOString() })
      .eq("id", plaidItemId);

    return NextResponse.json({
      item_id: itemId,
      institution_name: institutionName,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to exchange public token";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
