"use client";

import dynamic from "next/dynamic";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { ArrowDownRight, ArrowUpRight, Wallet } from "lucide-react";

import { BankAccountCard } from "@/components/dashboard/BankAccountCard";
import { GoalCards } from "@/components/dashboard/GoalCard";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useCurrency } from "@/hooks/useCurrency";
import { formatPercent } from "@/lib/utils";

const SpendingChart = dynamic(
  () => import("@/components/dashboard/SpendingChart").then((m) => m.SpendingChart),
  { ssr: false, loading: () => <Skeleton className="h-72 w-full rounded-lg" /> }
);

const IncomeChart = dynamic(
  () => import("@/components/dashboard/IncomeChart").then((m) => m.IncomeChart),
  { ssr: false, loading: () => <Skeleton className="h-72 w-full rounded-lg" /> }
);

interface OverviewStats {
  netWorth: number;
  spendingComparison: {
    currentSpending: number;
    previousSpending: number;
    delta: number;
    percentChange: number;
  };
  topCategories: Array<{
    categoryId: string;
    label: string;
    color: string;
    amount: number;
  }>;
  categoryBreakdown: Array<{
    categoryId: string;
    name: string;
    color: string;
    amount: number;
  }>;
  incomeBreakdown: Array<{
    categoryId: string;
    name: string;
    color: string;
    amount: number;
  }>;
}

const EMPTY_OVERVIEW: OverviewStats = {
  netWorth: 0,
  spendingComparison: {
    currentSpending: 0,
    previousSpending: 0,
    delta: 0,
    percentChange: 0,
  },
  topCategories: [],
  categoryBreakdown: [],
  incomeBreakdown: [],
};

async function fetchOverviewStats(): Promise<OverviewStats> {
  const response = await fetch("/api/overview");
  if (!response.ok) {
    throw new Error("Failed to fetch overview stats");
  }
  const payload = (await response.json()) as Partial<OverviewStats>;
  return {
    ...EMPTY_OVERVIEW,
    ...payload,
    spendingComparison: {
      ...EMPTY_OVERVIEW.spendingComparison,
      ...payload.spendingComparison,
    },
    topCategories: payload.topCategories ?? [],
    categoryBreakdown: payload.categoryBreakdown ?? [],
    incomeBreakdown: payload.incomeBreakdown ?? [],
  };
}

export function OverviewContent() {
  const { formatAmount } = useCurrency();
  const { data, isLoading, isFetching, error } = useQuery({
    queryKey: ["overview"],
    queryFn: fetchOverviewStats,
    placeholderData: keepPreviousData,
    retry: 2,
  });

  const overview = data ?? EMPTY_OVERVIEW;
  const spending = overview.spendingComparison;
  const isSpendingUp = (spending.delta ?? 0) > 0;
  const maxCategoryAmount = overview.topCategories[0]?.amount ?? 1;
  const showOverviewError = Boolean(error) && !isFetching && !isLoading;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-3">
        <BankAccountCard />

        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="size-4 text-primary" />
              Net Worth
            </CardTitle>
            <CardDescription>Total across connected accounts</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-9 w-32" />
            ) : showOverviewError ? (
              <p className="text-sm text-negative">Unable to load net worth</p>
            ) : (
              <p className="text-3xl font-semibold">{formatAmount(overview.netWorth)}</p>
            )}
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle>Monthly Spending</CardTitle>
            <CardDescription>This month vs last month</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-9 w-32" />
                <Skeleton className="h-4 w-48" />
              </div>
            ) : showOverviewError ? (
              <p className="text-sm text-negative">Unable to load spending comparison</p>
            ) : (
              <>
                <p className="text-3xl font-semibold">
                  {formatAmount(spending.currentSpending)}
                </p>
                <div
                  className={`flex items-center gap-1 text-sm ${
                    isSpendingUp ? "text-negative" : "text-positive"
                  }`}
                >
                  {isSpendingUp ? (
                    <ArrowUpRight className="size-4" />
                  ) : (
                    <ArrowDownRight className="size-4" />
                  )}
                  <span>
                    {formatAmount(Math.abs(spending.delta))} ({formatPercent(spending.percentChange)})
                    vs last month
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Last month: {formatAmount(spending.previousSpending)}
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle>Top Categories</CardTitle>
          <CardDescription>Where your money went this month</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                  <Skeleton className="h-2 w-full rounded-full" />
                </div>
              ))}
            </div>
          ) : showOverviewError ? (
            <p className="text-sm text-negative">Unable to load category breakdown</p>
          ) : !overview.topCategories.length ? (
            <p className="text-sm text-muted-foreground">No category data yet.</p>
          ) : (
            overview.topCategories.map((category) => {
              const width = `${(category.amount / maxCategoryAmount) * 100}%`;

              return (
                <div key={category.categoryId} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span>{category.label}</span>
                    <span className="text-muted-foreground">
                      {formatAmount(category.amount)}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-muted">
                    <div
                      className="h-2 rounded-full"
                      style={{ width, backgroundColor: category.color }}
                    />
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <SpendingChart data={overview.categoryBreakdown} />
        <IncomeChart data={overview.incomeBreakdown} />
      </div>

      <div>
        <h3 className="mb-4 text-lg font-semibold">Savings Goals</h3>
        <GoalCards />
      </div>
    </div>
  );
}
