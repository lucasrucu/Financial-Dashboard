"use client";

import { useCallback } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
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
import { Skeleton } from "@/components/ui/skeleton";
import { useCurrency } from "@/hooks/useCurrency";
import { useForecast } from "@/hooks/useForecast";
import { getThemeCssVar } from "@/lib/applyTheme";
import { useThemeStore } from "@/stores/themeStore";

export function ForecastChart() {
  const { formatAmount } = useCurrency();
  const selectedThemeId = useThemeStore((state) => state.selectedThemeId);
  const { data, isLoading, error } = useForecast();

  const tooltipFormatter = useCallback(
    (value: unknown, name: unknown) => [
      formatAmount(Number(value ?? 0)),
      String(name),
    ],
    [formatAmount]
  );

  const tooltipStyle = {
    backgroundColor: getThemeCssVar("popover"),
    border: `1px solid ${getThemeCssVar("border")}`,
    borderRadius: "0.5rem",
  };
  const tooltipTextStyle = { color: getThemeCssVar("popover-foreground") };

  // Index of the last historical month — where the dashed projection begins.
  const seamLabel = (() => {
    if (!data) return null;
    const lastActual = [...data.points]
      .reverse()
      .find((point) => point.netProfit !== null);
    return lastActual?.label ?? null;
  })();

  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <CardTitle>Revenue & Profit Forecast</CardTitle>
        <CardDescription>
          Past months (solid) with a projection for the next{" "}
          {data?.projectionMonths ?? 3} months (dashed), via linear regression.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <Skeleton className="h-72 w-full rounded-lg" />
        ) : error ? (
          <p className="py-12 text-center text-sm text-negative">
            Unable to load forecast.
          </p>
        ) : !data?.hasEnoughData ? (
          <p className="py-12 text-center text-sm text-muted-foreground">
            Not enough data yet. At least 3 months of history are needed before a
            projection can be drawn — keep importing transactions and this chart will
            fill in.
          </p>
        ) : (
          <>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={data.points}
                  margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke={getThemeCssVar("border")}
                    vertical={false}
                  />
                  <XAxis
                    dataKey="label"
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
                  />
                  <Legend
                    wrapperStyle={{ fontSize: 12, color: getThemeCssVar("muted-foreground") }}
                  />
                  {seamLabel ? (
                    <ReferenceLine
                      x={seamLabel}
                      stroke={getThemeCssVar("border")}
                      strokeDasharray="4 4"
                      label={{
                        value: "now",
                        position: "top",
                        fill: getThemeCssVar("muted-foreground"),
                        fontSize: 11,
                      }}
                    />
                  ) : null}

                  {/* Historical actuals — solid */}
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    name="Revenue"
                    stroke={getThemeCssVar("positive")}
                    strokeWidth={2}
                    dot={false}
                    connectNulls={false}
                    isAnimationActive={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="netProfit"
                    name="Net profit"
                    stroke={getThemeCssVar("primary")}
                    strokeWidth={2}
                    dot={false}
                    connectNulls={false}
                    isAnimationActive={false}
                  />

                  {/* Projected future — dashed, lighter */}
                  <Line
                    type="monotone"
                    dataKey="projectedRevenue"
                    name="Revenue (projected)"
                    stroke={getThemeCssVar("positive")}
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    strokeOpacity={0.6}
                    dot={false}
                    connectNulls
                    isAnimationActive={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="projectedNetProfit"
                    name="Net profit (projected)"
                    stroke={getThemeCssVar("primary")}
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    strokeOpacity={0.6}
                    dot={false}
                    connectNulls
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <p className="text-xs text-muted-foreground">
              Projection is a least-squares trend over the last {data.historyMonths}{" "}
              months. Future values are estimates, not guarantees.
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
