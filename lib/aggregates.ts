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
import { EXCLUDED_FROM_TOTALS_CATEGORY_IDS } from "@/constants/categories";
import type { AiAnalysisPayload, AiPortfolioPosition } from "@/types/ai";
import type { Goal } from "@/types/goal";
import type { Transaction } from "@/types/transaction";

// Cap how many portfolio positions ship to the AI. Same root cause as the roast
// JSON-parse bug — an uncapped holdings list bloats the prompt and the response.
const MAX_AI_PORTFOLIO_POSITIONS = 25;

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

function isExcludedFromTotals(transaction: Transaction) {
  return EXCLUDED_FROM_TOTALS_CATEGORY_IDS.has(transaction.category_id);
}

function sumSpending(transactions: Transaction[]) {
  return transactions
    .filter((transaction) => transaction.amount_usd > 0 && !isExcludedFromTotals(transaction))
    .reduce((sum, transaction) => sum + transaction.amount_usd, 0);
}

function sumIncome(transactions: Transaction[]) {
  return transactions
    .filter((transaction) => transaction.amount_usd < 0 && !isExcludedFromTotals(transaction))
    .reduce((sum, transaction) => sum + Math.abs(transaction.amount_usd), 0);
}

export async function fetchTransactionsInRange(
  supabase: SupabaseClient,
  userId: string,
  start: string,
  end: string
) {
  // RLS already scopes reads to the session user; the explicit user_id filter is
  // defense-in-depth so a misconfigured policy can't widen the result set.
  const { data, error } = await supabase
    .from("transactions")
    .select("*")
    .eq("user_id", userId)
    .gte("date", start)
    .lte("date", end);

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}

interface CategoryTotal {
  categoryId: string;
  label: string;
  color: string;
  amount: number;
}

// Pure, in-memory aggregation over an already-fetched transaction list — lets the
// overview path fetch each month's transactions once and derive every metric from
// them, instead of re-querying the same range per metric.
function computeCategoryTotals(
  transactions: Transaction[],
  categoryMap: Map<string, Category>,
  direction: "spending" | "income"
): CategoryTotal[] {
  const totals = new Map<string, number>();

  for (const transaction of transactions) {
    if (isExcludedFromTotals(transaction)) continue;
    const amount = Number(transaction.amount_usd);
    if (direction === "spending" && amount <= 0) continue;
    if (direction === "income" && amount >= 0) continue;

    const value = direction === "spending" ? amount : Math.abs(amount);
    totals.set(
      transaction.category_id,
      (totals.get(transaction.category_id) ?? 0) + value
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

function toBreakdown({ categoryId, label, color, amount }: CategoryTotal) {
  return { categoryId, name: label, color, amount };
}

// Single source of truth for the dashboard overview. Fetches this month's and last
// month's transactions (plus categories and balances) once, then computes net worth,
// the spending comparison, category/income breakdowns, and the monthly summary from
// those in-memory arrays — previously each metric re-queried the same date range.
export async function getOverviewData(
  supabase: SupabaseClient,
  userId: string,
  monthOffset = 0
) {
  const currentRange = getMonthRange(monthOffset);
  const previousRange = getMonthRange(monthOffset - 1);

  const [currentTransactions, previousTransactions, categories, effectiveBalances] =
    await Promise.all([
      fetchTransactionsInRange(supabase, userId, currentRange.start, currentRange.end),
      fetchTransactionsInRange(supabase, userId, previousRange.start, previousRange.end),
      ensureDefaultCategories(supabase, userId),
      getEffectiveBalancesForAccounts(supabase, userId),
    ]);

  const categoryMap = buildCategoryMap(categories);

  const netWorth = Array.from(effectiveBalances.values()).reduce(
    (sum, balance) => sum + balance,
    0
  );

  const currentSpending = sumSpending(currentTransactions);
  const previousSpending = sumSpending(previousTransactions);
  const delta = currentSpending - previousSpending;
  const percentChange =
    previousSpending === 0 ? 0 : (delta / previousSpending) * 100;
  const monthlyIncome = sumIncome(currentTransactions);

  const spendingTotals = computeCategoryTotals(currentTransactions, categoryMap, "spending");
  const incomeTotals = computeCategoryTotals(currentTransactions, categoryMap, "income");

  return {
    netWorth,
    spendingComparison: {
      currentSpending,
      previousSpending,
      delta,
      percentChange,
    },
    topCategories: spendingTotals.slice(0, 3),
    categoryBreakdown: spendingTotals.map(toBreakdown),
    incomeBreakdown: incomeTotals.map(toBreakdown),
    monthlySummary: {
      income: monthlyIncome,
      spending: currentSpending,
      net: monthlyIncome - currentSpending,
    },
  };
}

export async function buildAiAnalysisPayload(
  supabase: SupabaseClient,
  userId: string
): Promise<AiAnalysisPayload> {
  const range = getMonthRange(0);
  const transactions = await fetchTransactionsInRange(
    supabase,
    userId,
    range.start,
    range.end
  );
  const categories = await seedCategoriesIfEmpty(supabase, userId);
  const categoryMap = buildCategoryMap(categories);

  const { data: goals, error } = await supabase
    .from("goals")
    .select("*")
    .eq("user_id", userId);

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
    if (transaction.amount_usd <= 0 || isExcludedFromTotals(transaction)) {
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
    .filter(
      (transaction) =>
        !isExcludedFromTotals(transaction) &&
        (transaction.is_recurring || transaction.amount_usd > 200)
    )
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

  // Fetch latest portfolio snapshot if one exists
  const { data: snapshot } = await supabase
    .from("portfolio_snapshots")
    .select("id, snapshot_date, total_value_usd")
    .eq("user_id", userId)
    .order("snapshot_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  let portfolio: AiAnalysisPayload["portfolio"] = null;

  if (snapshot) {
    const { data: positions } = await supabase
      .from("stock_positions")
      .select("ticker, current_value_usd, total_gain_usd, total_gain_pct, is_money_market")
      .eq("user_id", userId)
      .eq("snapshot_id", snapshot.id)
      .order("current_value_usd", { ascending: false })
      .limit(MAX_AI_PORTFOLIO_POSITIONS);

    const mappedPositions: AiPortfolioPosition[] = (positions ?? []).map((p) => ({
      ticker: p.ticker as string,
      valueUsd: Number(p.current_value_usd),
      gainUsd: p.total_gain_usd !== null ? Number(p.total_gain_usd) : null,
      gainPct: p.total_gain_pct !== null ? Number(p.total_gain_pct) : null,
      isMoneyMarket: Boolean(p.is_money_market),
    }));

    const totalGainUsd = mappedPositions.every((p) => p.gainUsd !== null)
      ? mappedPositions.reduce((sum, p) => sum + (p.gainUsd ?? 0), 0)
      : null;

    portfolio = {
      totalValueUsd: Number(snapshot.total_value_usd),
      totalGainUsd,
      snapshotDate: snapshot.snapshot_date as string,
      positions: mappedPositions,
    };
  }

  return {
    period,
    totalIncome,
    totalSpending,
    topCategories,
    biggestMerchants,
    savingsRate,
    goals: goalProgress,
    flaggedTransactions,
    portfolio,
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
