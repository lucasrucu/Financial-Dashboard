"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowDownRight, ArrowUpRight, Loader2, Wallet } from "lucide-react";

import { BankAccountCard } from "@/components/dashboard/BankAccountCard";
import { GoalCards } from "@/components/dashboard/GoalCard";
import { SpendingChart } from "@/components/dashboard/SpendingChart";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useCurrency } from "@/hooks/useCurrency";
import { formatPercent } from "@/lib/utils";

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
}

async function fetchOverviewStats() {
  const response = await fetch("/api/overview");
  if (!response.ok) {
    throw new Error("Failed to fetch overview stats");
  }
  return response.json() as Promise<OverviewStats>;
}

export function OverviewContent() {
  const { formatAmount } = useCurrency();
  const { data, isLoading, error } = useQuery({
    queryKey: ["overview"],
    queryFn: fetchOverviewStats,
  });

  const spending = data?.spendingComparison;
  const isSpendingUp = (spending?.delta ?? 0) > 0;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-3">
        <BankAccountCard />

        <Card className="border-slate-800 bg-slate-900/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="size-4 text-primary" />
              Net Worth
            </CardTitle>
            <CardDescription>Total across connected accounts</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Loader2 className="size-5 animate-spin text-muted-foreground" />
            ) : error ? (
              <p className="text-sm text-negative">Unable to load net worth</p>
            ) : (
              <p className="text-3xl font-semibold">{formatAmount(data?.netWorth ?? 0)}</p>
            )}
          </CardContent>
        </Card>

        <Card className="border-slate-800 bg-slate-900/50">
          <CardHeader>
            <CardTitle>Monthly Spending</CardTitle>
            <CardDescription>This month vs last month</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {isLoading ? (
              <Loader2 className="size-5 animate-spin text-muted-foreground" />
            ) : error || !spending ? (
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

      <Card className="border-slate-800 bg-slate-900/50">
        <CardHeader>
          <CardTitle>Top Categories</CardTitle>
          <CardDescription>Where your money went this month</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          ) : !data?.topCategories.length ? (
            <p className="text-sm text-muted-foreground">No category data yet.</p>
          ) : (
            data.topCategories.map((category) => {
              const maxAmount = data.topCategories[0]?.amount ?? 1;
              const width = `${(category.amount / maxAmount) * 100}%`;

              return (
                <div key={category.categoryId} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span>{category.label}</span>
                    <span className="text-muted-foreground">
                      {formatAmount(category.amount)}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-800">
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

      <SpendingChart data={data?.categoryBreakdown ?? []} />

      <div>
        <h3 className="mb-4 text-lg font-semibold">Savings Goals</h3>
        <GoalCards />
      </div>
    </div>
  );
}
