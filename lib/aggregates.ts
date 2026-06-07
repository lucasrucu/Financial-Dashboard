import type { SupabaseClient } from "@supabase/supabase-js";

import {
  buildCategoryMap,
  resolveCategoryColor,
  resolveCategoryLabel,
  ensureDefaultCategories,
  seedCategoriesIfEmpty,
  type Category,
} from "@/lib/categories";
import { getEffectiveBalancesForAccounts } from "@/lib/accountBalance";
import type { AiAnalysisPayload } from "@/types/ai";
import type { Goal } from "@/types/goal";
import type { Transaction } from "@/types/transaction";

function formatLocalDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getMonthRange(monthOffset = 0) {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
  const end = new Date(now.getFullYear(), now.getMonth() + monthOffset + 1, 0);
  return {
    start: formatLocalDate(start),
    end: formatLocalDate(end),
  };
}

function sumSpending(transactions: Transaction[]) {
  return transactions
    .filter((transaction) => transaction.amount_usd > 0)
    .reduce((sum, transaction) => sum + transaction.amount_usd, 0);
}

function sumIncome(transactions: Transaction[]) {
  return transactions
    .filter((transaction) => transaction.amount_usd < 0)
    .reduce((sum, transaction) => sum + Math.abs(transaction.amount_usd), 0);
}

export async function fetchTransactionsInRange(
  supabase: SupabaseClient,
  start: string,
  end: string
) {
  const { data, error } = await supabase
    .from("transactions")
    .select("*")
    .gte("date", start)
    .lte("date", end);

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}

export async function getNetWorth(supabase: SupabaseClient) {
  const effectiveBalances = await getEffectiveBalancesForAccounts(supabase);
  return Array.from(effectiveBalances.values()).reduce((sum, balance) => sum + balance, 0);
}

export async function getMonthlySpendingComparison(supabase: SupabaseClient) {
  const currentRange = getMonthRange(0);
  const previousRange = getMonthRange(-1);

  const [currentTransactions, previousTransactions] = await Promise.all([
    fetchTransactionsInRange(supabase, currentRange.start, currentRange.end),
    fetchTransactionsInRange(supabase, previousRange.start, previousRange.end),
  ]);

  const currentSpending = sumSpending(currentTransactions);
  const previousSpending = sumSpending(previousTransactions);
  const delta = currentSpending - previousSpending;
  const percentChange =
    previousSpending === 0 ? 0 : (delta / previousSpending) * 100;

  return {
    currentSpending,
    previousSpending,
    delta,
    percentChange,
  };
}

async function buildCategoryTotals(supabase: SupabaseClient, userId: string) {
  const range = getMonthRange(0);
  const [transactions, categories] = await Promise.all([
    fetchTransactionsInRange(supabase, range.start, range.end),
    ensureDefaultCategories(supabase, userId),
  ]);
  const categoryMap = buildCategoryMap(categories);
  const totals = new Map<string, number>();

  for (const transaction of transactions) {
    if (transaction.amount_usd <= 0) continue;
    totals.set(
      transaction.category_id,
      (totals.get(transaction.category_id) ?? 0) + Number(transaction.amount_usd)
    );
  }

  return Array.from(totals.entries())
    .map(([categoryId, amount]) => ({
      categoryId,
      label: resolveCategoryLabel(categoryId, categoryMap),
      color: resolveCategoryColor(categoryId, categoryMap),
      amount,
    }))
    .sort((a, b) => b.amount - a.amount);
}

async function buildIncomeCategoryTotals(supabase: SupabaseClient, userId: string) {
  const range = getMonthRange(0);
  const [transactions, categories] = await Promise.all([
    fetchTransactionsInRange(supabase, range.start, range.end),
    ensureDefaultCategories(supabase, userId),
  ]);
  const categoryMap = buildCategoryMap(categories);
  const totals = new Map<string, number>();

  for (const transaction of transactions) {
    if (transaction.amount_usd >= 0) continue;
    totals.set(
      transaction.category_id,
      (totals.get(transaction.category_id) ?? 0) + Math.abs(Number(transaction.amount_usd))
    );
  }

  return Array.from(totals.entries())
    .map(([categoryId, amount]) => ({
      categoryId,
      label: resolveCategoryLabel(categoryId, categoryMap),
      color: resolveCategoryColor(categoryId, categoryMap),
      amount,
    }))
    .sort((a, b) => b.amount - a.amount);
}

export async function getTopCategories(
  supabase: SupabaseClient,
  userId: string,
  limit = 3
) {
  return (await buildCategoryTotals(supabase, userId)).slice(0, limit);
}

export async function getCategoryBreakdown(supabase: SupabaseClient, userId: string) {
  return (await buildCategoryTotals(supabase, userId)).map(
    ({ categoryId, label, color, amount }) => ({ categoryId, name: label, color, amount })
  );
}

export async function getIncomeCategoryBreakdown(
  supabase: SupabaseClient,
  userId: string
) {
  return (await buildIncomeCategoryTotals(supabase, userId)).map(
    ({ categoryId, label, color, amount }) => ({ categoryId, name: label, color, amount })
  );
}

export async function getCategoryData(
  supabase: SupabaseClient,
  userId: string,
  topLimit = 3
) {
  const sorted = await buildCategoryTotals(supabase, userId);
  return {
    topCategories: sorted.slice(0, topLimit),
    categoryBreakdown: sorted.map(({ categoryId, label, color, amount }) => ({
      categoryId,
      name: label,
      color,
      amount,
    })),
  };
}

export async function buildAiAnalysisPayload(
  supabase: SupabaseClient,
  userId: string
): Promise<AiAnalysisPayload> {
  const range = getMonthRange(0);
  const transactions = await fetchTransactionsInRange(supabase, range.start, range.end);
  const categories = await seedCategoriesIfEmpty(supabase, userId);
  const categoryMap = buildCategoryMap(categories);

  const { data: goals, error } = await supabase.from("goals").select("*");

  if (error) {
    throw new Error(error.message);
  }

  const totalIncome = sumIncome(transactions);
  const totalSpending = sumSpending(transactions);
  const savingsRate =
    totalIncome === 0 ? 0 : ((totalIncome - totalSpending) / totalIncome) * 100;

  const categoryTotals = new Map<string, number>();
  const merchantTotals = new Map<string, number>();

  for (const transaction of transactions) {
    if (transaction.amount_usd <= 0) {
      continue;
    }

    const label = resolveCategoryLabel(transaction.category_id, categoryMap);

    categoryTotals.set(
      label,
      (categoryTotals.get(label) ?? 0) + Number(transaction.amount_usd)
    );

    merchantTotals.set(
      transaction.name,
      (merchantTotals.get(transaction.name) ?? 0) + Number(transaction.amount_usd)
    );
  }

  const topCategories = Array.from(categoryTotals.entries())
    .map(([name, amount]) => ({ name, amount }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5);

  const biggestMerchants = Array.from(merchantTotals.entries())
    .map(([name, amount]) => ({ name, amount }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5);

  const flaggedTransactions = transactions
    .filter((transaction) => transaction.is_recurring || transaction.amount_usd > 200)
    .slice(0, 5)
    .map(
      (transaction) =>
        `${transaction.name} ($${Number(transaction.amount_usd).toFixed(2)} on ${transaction.date})`
    );

  const goalProgress = (goals ?? []).map((goal: Goal) => ({
    name: goal.name,
    progress: goal.target_usd === 0 ? 0 : (goal.saved_usd / goal.target_usd) * 100,
  }));

  const period = `${range.start} to ${range.end}`;

  return {
    period,
    totalIncome,
    totalSpending,
    topCategories,
    biggestMerchants,
    savingsRate,
    goals: goalProgress,
    flaggedTransactions,
  };
}

export function detectRecurringTransactions(
  transactions: Array<{ name: string; amount_usd: number; date: string }>
) {
  const counts = new Map<string, number>();

  for (const transaction of transactions) {
    const key = `${transaction.name.toLowerCase()}|${Math.round(transaction.amount_usd)}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const recurringKeys = new Set(
    Array.from(counts.entries())
      .filter(([, count]) => count >= 2)
      .map(([key]) => key)
  );

  return transactions.map((transaction) => {
    const key = `${transaction.name.toLowerCase()}|${Math.round(transaction.amount_usd)}`;
    return recurringKeys.has(key);
  });
}

export type { Category };
