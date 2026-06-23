"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { CategoryDatum } from "@/components/dashboard/CategoryPieChart";

// Standalone copy of the dashboard's CategoryPieChart for the public demo.
// The real chart pulls a live exchange rate via useCurrency() (an auth-gated
// fetch); here we format USD locally so the landing page makes zero network
// calls. Visuals are intentionally identical.

const formatUsd = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);

interface DemoCategoryChartProps {
  title: string;
  description: string;
  totalLabel: string;
  data: CategoryDatum[];
}

export function DemoCategoryChart({
  title,
  description,
  totalLabel,
  data,
}: DemoCategoryChartProps) {
  const total = data.reduce((sum, entry) => sum + entry.amount, 0);

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
                formatter={(value: unknown) => formatUsd(Number(value ?? 0))}
                contentStyle={{
                  backgroundColor: "hsl(var(--popover))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "0.5rem",
                }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
            <p className="text-xs text-muted-foreground">{totalLabel}</p>
            <p className="text-lg font-semibold">{formatUsd(total)}</p>
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
              <span className="text-muted-foreground">{formatUsd(entry.amount)}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
