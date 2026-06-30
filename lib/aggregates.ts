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
import type { Budget, BudgetProgress, BudgetSummary } from "@/types/budget";
import type { ForecastData, ForecastPoint } from "@/types/forecast";
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

  const [
    currentTransactions,
    previousTransactions,
    categories,
    effectiveBalances,
    budgets,
  ] = await Promise.all([
    fetchTransactionsInRange(supabase, userId, currentRange.start, currentRange.end),
    fetchTransactionsInRange(supabase, userId, previousRange.start, previousRange.end),
    ensureDefaultCategories(supabase, userId),
    getEffectiveBalancesForAccounts(supabase, userId),
    fetchBudgets(supabase, userId),
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

  // Budget summary derived from the same in-memory spending totals — no extra
  // per-category fetch. Counts how many budgets the current month exceeds.
  const spendingByCategory = new Map<string, number>(
    spendingTotals.map((total) => [total.categoryId, total.amount])
  );
  const budgetSummary: BudgetSummary = {
    totalBudgets: budgets.length,
    overLimitCount: budgets.filter(
      (budget) => (spendingByCategory.get(budget.category) ?? 0) > Number(budget.amount)
    ).length,
  };

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
    budgetSummary,
  };
}

// Spend-vs-budget for the current month. Fetches this month's transactions once
// (same pattern as getOverviewData) plus the user's budgets and categories, then
// derives per-category spend and compares it against each budget in-memory.
export async function getBudgetProgress(
  supabase: SupabaseClient,
  userId: string,
  monthOffset = 0
): Promise<{ progress: BudgetProgress[]; summary: BudgetSummary }> {
  const range = getMonthRange(monthOffset);

  const [transactions, categories, budgets] = await Promise.all([
    fetchTransactionsInRange(supabase, userId, range.start, range.end),
    ensureDefaultCategories(supabase, userId),
    fetchBudgets(supabase, userId),
  ]);

  const categoryMap = buildCategoryMap(categories);

  const spendingByCategory = new Map<string, number>();
  for (const total of computeCategoryTotals(transactions, categoryMap, "spending")) {
    spendingByCategory.set(total.categoryId, total.amount);
  }

  const progress: BudgetProgress[] = budgets
    .map((budget) => {
      const spent = spendingByCategory.get(budget.category) ?? 0;
      const limit = Number(budget.amount);
      const remaining = limit - spent;
      const percentUsed = limit === 0 ? 0 : (spent / limit) * 100;

      return {
        budgetId: budget.id,
        categoryId: budget.category,
        label: resolveCategoryLabel(budget.category, categoryMap),
        color: resolveCategoryColor(budget.category, categoryMap),
        amount: limit,
        spent,
        remaining,
        percentUsed,
        overBudget: spent > limit,
      };
    })
    .sort((a, b) => b.percentUsed - a.percentUsed);

  const summary: BudgetSummary = {
    totalBudgets: progress.length,
    overLimitCount: progress.filter((item) => item.overBudget).length,
  };

  return { progress, summary };
}

// PostgREST reports a missing table as PGRST205 (schema-cache miss); the
// underlying Postgres code is 42P01 (undefined_table). Either means the budgets
// migration hasn't been applied to this database yet.
function isMissingTableError(error: { code?: string } | null): boolean {
  return error?.code === "PGRST205" || error?.code === "42P01";
}

export async function fetchBudgets(
  supabase: SupabaseClient,
  userId: string
): Promise<Budget[]> {
  // RLS scopes this to the session user; the explicit user_id filter is
  // defense-in-depth, matching fetchTransactionsInRange.
  const { data, error } = await supabase
    .from("budgets")
    .select("*")
    .eq("user_id", userId)
    .order("created_at");

  if (error) {
    // Budgets are an optional add-on. If the table hasn't been migrated yet,
    // treat it as "no budgets" so the overview's core metrics (net worth,
    // spending, categories) still load instead of failing as a group.
    if (isMissingTableError(error)) {
      return [];
    }
    throw new Error(error.message);
  }

  return (data ?? []).map((budget) => ({
    id: budget.id,
    category: budget.category,
    amount: Number(budget.amount),
    period: budget.period,
    created_at: budget.created_at,
  }));
}

const MIN_FORECAST_HISTORY = 3;

// Least-squares linear regression over an evenly-spaced series. x is the index
// (0..n-1). Returns slope + intercept so future points are intercept + slope * x.
function linearRegression(values: number[]): { slope: number; intercept: number } {
  const n = values.length;
  if (n === 0) return { slope: 0, intercept: 0 };
  if (n === 1) return { slope: 0, intercept: values[0] };

  const sumX = (n * (n - 1)) / 2;
  const sumXX = ((n - 1) * n * (2 * n - 1)) / 6;
  let sumY = 0;
  let sumXY = 0;
  for (let i = 0; i < n; i += 1) {
    sumY += values[i];
    sumXY += i * values[i];
  }

  const denominator = n * sumXX - sumX * sumX;
  if (denominator === 0) {
    return { slope: 0, intercept: sumY / n };
  }

  const slope = (n * sumXY - sumX * sumY) / denominator;
  const intercept = (sumY - slope * sumX) / n;
  return { slope, intercept };
}

function monthKeyFromOffset(monthOffset: number) {
  const now = new Date();
  const date = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return {
    key: `${year}-${month}`,
    label: date.toLocaleDateString("en-US", { month: "short", year: "numeric" }),
  };
}

// Pulls the trailing `historyMonths` of revenue (income) and net profit, then
// projects `projectionMonths` ahead via least-squares linear regression. Each
// historical month is fetched exactly once (in parallel) — no N+1 per metric.
export async function getForecastData(
  supabase: SupabaseClient,
  userId: string,
  historyMonths = 6,
  projectionMonths = 3
): Promise<ForecastData> {
  // Build the trailing month ranges (oldest first), ending with the current month.
  const offsets: number[] = [];
  for (let i = historyMonths - 1; i >= 0; i -= 1) {
    offsets.push(-i);
  }

  const monthlyTransactions = await Promise.all(
    offsets.map((offset) => {
      const range = getMonthRange(offset);
      return fetchTransactionsInRange(supabase, userId, range.start, range.end);
    })
  );

  const revenueSeries: number[] = [];
  const netSeries: number[] = [];
  const historicalPoints: ForecastPoint[] = [];

  offsets.forEach((offset, index) => {
    const transactions = monthlyTransactions[index];
    const revenue = sumIncome(transactions);
    const spending = sumSpending(transactions);
    const net = revenue - spending;
    revenueSeries.push(revenue);
    netSeries.push(net);

    const { key, label } = monthKeyFromOffset(offset);
    historicalPoints.push({
      month: key,
      label,
      revenue,
      netProfit: net,
      projectedRevenue: null,
      projectedNetProfit: null,
    });
  });

  // A month with no transactions yet (e.g. the current month early on) reads as 0
  // and would drag the regression down. Drop leading/trailing all-zero months so
  // the trend reflects real activity, but keep interior months as legitimate data.
  const nonZeroIndex = revenueSeries.findIndex(
    (value, i) => value !== 0 || netSeries[i] !== 0
  );
  const hasAnyData = nonZeroIndex !== -1;
  const effectiveHistoryCount = hasAnyData
    ? revenueSeries.length - nonZeroIndex
    : 0;

  const hasEnoughData = effectiveHistoryCount >= MIN_FORECAST_HISTORY;

  if (!hasEnoughData) {
    return {
      points: historicalPoints,
      historyMonths: effectiveHistoryCount,
      projectionMonths,
      hasEnoughData: false,
      method: "linear-regression",
    };
  }

  const trimmedRevenue = revenueSeries.slice(nonZeroIndex);
  const trimmedNet = netSeries.slice(nonZeroIndex);

  const revenueFit = linearRegression(trimmedRevenue);
  const netFit = linearRegression(trimmedNet);

  // The last historical point doubles as the seam: give it projected values equal
  // to its actuals so the dashed projection line connects to the solid history.
  const lastHistorical = historicalPoints[historicalPoints.length - 1];
  lastHistorical.projectedRevenue = lastHistorical.revenue;
  lastHistorical.projectedNetProfit = lastHistorical.netProfit;

  const projectionPoints: ForecastPoint[] = [];
  for (let step = 1; step <= projectionMonths; step += 1) {
    const x = trimmedRevenue.length - 1 + step;
    const { key, label } = monthKeyFromOffset(step);
    projectionPoints.push({
      month: key,
      label,
      revenue: null,
      netProfit: null,
      projectedRevenue: Math.max(0, revenueFit.intercept + revenueFit.slope * x),
      projectedNetProfit: netFit.intercept + netFit.slope * x,
    });
  }

  return {
    points: [...historicalPoints, ...projectionPoints],
    historyMonths: effectiveHistoryCount,
    projectionMonths,
    hasEnoughData: true,
    method: "linear-regression",
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
