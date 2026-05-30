import type { SupabaseClient } from "@supabase/supabase-js";

import { detectRecurringTransactions } from "@/lib/aggregates";
import { fetchAccounts, fetchTransactions } from "@/lib/plaid";
import { mapPlaidCategory } from "@/lib/utils";

export async function syncPlaidAccounts(
  supabase: SupabaseClient,
  accessToken: string,
  plaidItemId: string,
  userId: string
) {
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

  const accountPayloads = accounts.map((account) => {
    const payload: {
      plaid_account_id: string;
      plaid_item_id: string;
      user_id: string;
      name: string;
      balance_usd?: number;
      mask: string | null;
      subtype: string | null;
    } = {
      plaid_account_id: account.plaid_account_id,
      plaid_item_id: plaidItemId,
      user_id: userId,
      name: account.name,
      mask: account.mask,
      subtype: account.subtype,
    };

    if (!anchoredAccountIds.has(account.plaid_account_id)) {
      payload.balance_usd = account.balance_usd;
    }

    return payload;
  });

  const { error } = await supabase
    .from("accounts")
    .upsert(accountPayloads, { onConflict: "plaid_account_id" });

  if (error) {
    throw new Error(error.message);
  }

  return accounts;
}

export async function syncPlaidTransactions(
  supabase: SupabaseClient,
  accessToken: string,
  userId: string,
  days = 90
) {
  const transactions = await fetchTransactions(accessToken, days);
  const recurringFlags = detectRecurringTransactions(transactions);

  const { data: accountRows } = await supabase
    .from("accounts")
    .select("id, plaid_account_id");

  const accountMap = new Map(
    (accountRows ?? []).map((account) => [account.plaid_account_id, account.id])
  );

  const plaidIds = transactions.map((transaction) => transaction.plaid_transaction_id);
  const { data: existingRows } = plaidIds.length
    ? await supabase
        .from("transactions")
        .select("plaid_transaction_id, category_id, category_source")
        .in("plaid_transaction_id", plaidIds)
    : { data: [] };

  const existingMap = new Map(
    (existingRows ?? []).map((row) => [row.plaid_transaction_id, row])
  );

  const transactionPayloads = transactions
    .map((transaction, index) => {
      const accountId = accountMap.get(transaction.plaid_account_id);

      if (!accountId) {
        return null;
      }

      const mappedCategory = mapPlaidCategory(transaction.plaid_category);
      const existing = existingMap.get(transaction.plaid_transaction_id);

      if (existing && existing.category_source !== "auto") {
        return {
          plaid_transaction_id: transaction.plaid_transaction_id,
          account_id: accountId,
          user_id: userId,
          date: transaction.date,
          name: transaction.name,
          amount_usd: transaction.amount_usd,
          category_id: existing.category_id,
          category_source: existing.category_source,
          plaid_category: transaction.plaid_category,
          is_recurring: recurringFlags[index] ?? false,
          source: "plaid",
        };
      }

      return {
        plaid_transaction_id: transaction.plaid_transaction_id,
        account_id: accountId,
        user_id: userId,
        date: transaction.date,
        name: transaction.name,
        amount_usd: transaction.amount_usd,
        category_id: mappedCategory,
        category_source: "auto",
        plaid_category: transaction.plaid_category,
        is_recurring: recurringFlags[index] ?? false,
        source: "plaid",
      };
    })
    .filter((t) => t !== null);

  if (transactionPayloads.length > 0) {
    const { error } = await supabase
      .from("transactions")
      .upsert(transactionPayloads, { onConflict: "plaid_transaction_id" });

    if (error) {
      throw new Error(error.message);
    }
  }

  return transactions.length;
}
