"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PositionsTable } from "@/components/dashboard/PositionsTable";
import {
  DEMO_PORTFOLIO_GAIN_USD,
  DEMO_PORTFOLIO_VALUE_USD,
  DEMO_POSITIONS,
} from "@/components/landing/demo/sampleData";

const formatUsd = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);

export function DemoInvestments() {
  const gainPct = (DEMO_PORTFOLIO_GAIN_USD / (DEMO_PORTFOLIO_VALUE_USD - DEMO_PORTFOLIO_GAIN_USD)) * 100;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Portfolio value</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold tabular-nums">{formatUsd(DEMO_PORTFOLIO_VALUE_USD)}</p>
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total gain</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold tabular-nums text-positive">
              {formatUsd(DEMO_PORTFOLIO_GAIN_USD)}
              <span className="ml-2 text-base font-medium">+{gainPct.toFixed(1)}%</span>
            </p>
          </CardContent>
        </Card>
      </div>

      <PositionsTable positions={DEMO_POSITIONS} />
    </div>
  );
}
