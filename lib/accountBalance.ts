import { getSupabaseAdmin } from "@/lib/supabase";

export interface AccountBalanceRow {
  id: string;
  balance_usd: number;
  balance_anchor_usd: number | null;
  balance_anchor_date: string | null;
}

export function computeEffectiveBalance(
  account: Pick<AccountBalanceRow, "balance_usd" | "balance_anchor_usd">,
  transactionDelta: number
): number {
  if (account.balance_anchor_usd === null) {
    return Number(account.balance_usd);
  }

  return Number(account.balance_anchor_usd) + transactionDelta;
}

export async function getTransactionDeltaSinceAnchor(
  accountId: string,
  anchorDate: string
): Promise<number> {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from("transactions")
    .select("amount_usd")
    .eq("account_id", accountId)
    .gt("date", anchorDate);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).reduce(
    (sum, transaction) => sum - Number(transaction.amount_usd),
    0
  );
}

export async function getEffectiveBalanceForAccount(accountId: string): Promise<number> {
  const supabase = getSupabaseAdmin();

  const { data: account, error } = await supabase
    .from("accounts")
    .select("id, balance_usd, balance_anchor_usd, balance_anchor_date")
    .eq("id", accountId)
    .single();

  if (error || !account) {
    throw new Error(error?.message ?? "Account not found");
  }

  const row: AccountBalanceRow = {
    id: account.id,
    balance_usd: Number(account.balance_usd),
    balance_anchor_usd:
      account.balance_anchor_usd === null ? null : Number(account.balance_anchor_usd),
    balance_anchor_date: account.balance_anchor_date,
  };

  if (row.balance_anchor_usd === null || !row.balance_anchor_date) {
    return row.balance_usd;
  }

  const delta = await getTransactionDeltaSinceAnchor(row.id, row.balance_anchor_date);
  return computeEffectiveBalance(row, delta);
}

export async function getEffectiveBalancesForAccounts(): Promise<
  Map<string, number>
> {
  const supabase = getSupabaseAdmin();

  const { data: accounts, error } = await supabase
    .from("accounts")
    .select("id, balance_usd, balance_anchor_usd, balance_anchor_date");

  if (error) {
    throw new Error(error.message);
  }

  const rows = (accounts ?? []).map((account) => ({
    id: account.id,
    balance_usd: Number(account.balance_usd),
    balance_anchor_usd:
      account.balance_anchor_usd === null ? null : Number(account.balance_anchor_usd),
    balance_anchor_date: account.balance_anchor_date,
  }));

  const anchoredAccounts = rows.filter(
    (account) => account.balance_anchor_usd !== null && account.balance_anchor_date
  );

  const deltas = new Map<string, number>();

  if (anchoredAccounts.length > 0) {
    const accountIds = anchoredAccounts.map((account) => account.id);
    const { data: transactions, error: transactionError } = await supabase
      .from("transactions")
      .select("account_id, amount_usd, date")
      .in("account_id", accountIds);

    if (transactionError) {
      throw new Error(transactionError.message);
    }

    for (const account of anchoredAccounts) {
      const delta = (transactions ?? [])
        .filter(
          (transaction) =>
            transaction.account_id === account.id &&
            transaction.date > account.balance_anchor_date
        )
        .reduce((sum, transaction) => sum - Number(transaction.amount_usd), 0);

      deltas.set(account.id, delta);
    }
  }

  const effectiveBalances = new Map<string, number>();

  for (const account of rows) {
    const delta = deltas.get(account.id) ?? 0;
    effectiveBalances.set(account.id, computeEffectiveBalance(account, delta));
  }

  return effectiveBalances;
}

export async function enrichAccountsWithEffectiveBalance<
  T extends AccountBalanceRow & Record<string, unknown>,
>(accounts: T[]) {
  const effectiveBalances = await getEffectiveBalancesForAccounts();

  return accounts.map((account) => ({
    ...account,
    balance_usd: Number(account.balance_usd),
    balance_anchor_usd:
      account.balance_anchor_usd === null ? null : Number(account.balance_anchor_usd),
    effective_balance_usd: effectiveBalances.get(account.id) ?? Number(account.balance_usd),
  }));
}
