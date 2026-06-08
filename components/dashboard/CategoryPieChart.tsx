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

export interface CategoryDatum {
  categoryId: string;
  name: string;
  color: string;
  amount: number;
}

interface CategoryPieChartProps {
  title: string;
  description: string;
  emptyMessage: string;
  data: CategoryDatum[];
  totalLabel?: string;
}

export function CategoryPieChart({
  title,
  description,
  emptyMessage,
  data,
  totalLabel = "Total",
}: CategoryPieChartProps) {
  const { formatAmount } = useCurrency();
  const total = data.reduce((sum, entry) => sum + entry.amount, 0);
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
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="py-12 text-center text-sm text-muted-foreground">{emptyMessage}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="relative h-72">
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
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
            <p className="text-xs text-muted-foreground">{totalLabel}</p>
            <p className="text-lg font-semibold">{formatAmount(total)}</p>
          </div>
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
