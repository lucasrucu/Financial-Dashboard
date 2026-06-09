"use client";

import { useCallback } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
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

interface IncomeVsSpendingChartProps {
  income: number;
  spending: number;
  monthLabel: string;
}

export function IncomeVsSpendingChart({
  income,
  spending,
  monthLabel,
}: IncomeVsSpendingChartProps) {
  const { formatAmount } = useCurrency();
  const selectedThemeId = useThemeStore((state) => state.selectedThemeId);
  const net = income - spending;
  const hasData = income > 0 || spending > 0;

  const data = [
    { name: "Income", amount: income, color: getThemeCssVar("positive") },
    { name: "Spending", amount: spending, color: getThemeCssVar("negative") },
  ];

  const tooltipFormatter = useCallback(
    (value: unknown) => formatAmount(Number(value ?? 0)),
    [formatAmount]
  );
  const tooltipStyle = {
    backgroundColor: getThemeCssVar("popover"),
    border: `1px solid ${getThemeCssVar("border")}`,
    borderRadius: "0.5rem",
  };
  const tooltipTextStyle = { color: getThemeCssVar("popover-foreground") };

  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <CardTitle>Income vs Spending</CardTitle>
        <CardDescription>{monthLabel} cash flow comparison</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!hasData ? (
          <p className="py-12 text-center text-sm text-muted-foreground">
            No income or spending recorded in {monthLabel}.
          </p>
        ) : (
          <>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={getThemeCssVar("border")} vertical={false} />
                  <XAxis
                    dataKey="name"
                    tick={{ fill: getThemeCssVar("muted-foreground"), fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tickFormatter={(value) => formatAmount(Number(value))}
                    tick={{ fill: getThemeCssVar("muted-foreground"), fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                    width={80}
                  />
                  <Tooltip
                    key={selectedThemeId}
                    formatter={tooltipFormatter}
                    contentStyle={tooltipStyle}
                    labelStyle={tooltipTextStyle}
                    itemStyle={tooltipTextStyle}
                    cursor={{ fill: getThemeCssVar("muted"), opacity: 0.3 }}
                  />
                  <Bar dataKey="amount" radius={[6, 6, 0, 0]} maxBarSize={80}>
                    {data.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-4 py-3 text-sm">
              <span className="text-muted-foreground">Net (income − spending)</span>
              <span className={`font-semibold ${net >= 0 ? "text-positive" : "text-negative"}`}>
                {formatAmount(net)}
              </span>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
