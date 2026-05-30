"use client";

import { useCallback } from "react";
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useCurrency } from "@/hooks/useCurrency";
import { getThemeCssVar } from "@/lib/applyTheme";
import { useThemeStore } from "@/stores/themeStore";

interface CategoryDatum {
  categoryId: string;
  name: string;
  color: string;
  amount: number;
}

export function SpendingChart({ data }: { data: CategoryDatum[] }) {
  const { formatAmount } = useCurrency();
  const selectedThemeId = useThemeStore((state) => state.selectedThemeId);
  const tooltipFormatter = useCallback(
    (value: unknown) => formatAmount(Number(value ?? 0)),
    [formatAmount]
  );
  const tooltipStyle = {
    backgroundColor: getThemeCssVar("popover"),
    border: `1px solid ${getThemeCssVar("border")}`,
    borderRadius: "0.5rem",
  };

  if (!data.length) {
    return (
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle>Spending by Category</CardTitle>
          <CardDescription>Current month breakdown</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="py-12 text-center text-sm text-muted-foreground">
            No spending data yet. Connect a bank and sync transactions.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <CardTitle>Spending by Category</CardTitle>
        <CardDescription>Current month breakdown</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="amount"
                nameKey="name"
                innerRadius={70}
                outerRadius={110}
                paddingAngle={2}
              >
                {data.map((entry) => (
                  <Cell key={entry.categoryId} fill={entry.color} stroke="transparent" />
                ))}
              </Pie>
              <Tooltip
                key={selectedThemeId}
                formatter={tooltipFormatter}
                contentStyle={tooltipStyle}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {data.map((entry) => (
            <div key={entry.categoryId} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <span
                  className="size-2.5 rounded-full"
                  style={{ backgroundColor: entry.color }}
                />
                <span>{entry.name}</span>
              </div>
              <span className="text-muted-foreground">{formatAmount(entry.amount)}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
