"use client";

import { useState } from "react";
import { TrendingUp, TrendingDown, RefreshCw } from "lucide-react";

import { PageWrapper } from "@/components/layout/PageWrapper";
import { FidelityPortfolioUpload } from "@/components/dashboard/FidelityPortfolioUpload";
import { PositionsTable } from "@/components/dashboard/PositionsTable";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { usePortfolio } from "@/hooks/usePortfolio";

function formatUsd(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(value);
}

function PortfolioContent() {
  const { data: portfolio, isLoading } = usePortfolio();
  const [showUpload, setShowUpload] = useState(false);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24 text-muted-foreground text-sm">
        Loading portfolio…
      </div>
    );
  }

  if (!portfolio) {
    return <FidelityPortfolioUpload />;
  }

  const { snapshot, positions } = portfolio;
  const totalGain = positions.reduce(
    (sum, p) => (p.total_gain_usd !== null ? sum + p.total_gain_usd : sum),
    0
  );
  const hasGainData = positions.some((p) => p.total_gain_usd !== null);
  const gainIsPositive = totalGain >= 0;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardDescription>Portfolio Value</CardDescription>
            <CardTitle className="text-2xl tabular-nums">
              {formatUsd(snapshot.total_value_usd)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              As of {snapshot.snapshot_date}
            </p>
          </CardContent>
        </Card>

        {hasGainData ? (
          <Card className="border-border bg-card">
            <CardHeader className="pb-2">
              <CardDescription>Total Gain / Loss</CardDescription>
              <CardTitle
                className={`text-2xl tabular-nums flex items-center gap-2 ${gainIsPositive ? "text-green-500" : "text-red-500"}`}
              >
                {gainIsPositive ? (
                  <TrendingUp className="size-5 shrink-0" />
                ) : (
                  <TrendingDown className="size-5 shrink-0" />
                )}
                {formatUsd(totalGain)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                {snapshot.position_count} positions
              </p>
            </CardContent>
          </Card>
        ) : null}
      </div>

      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">Positions</h2>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setShowUpload((v) => !v)}
        >
          <RefreshCw className="size-3.5" />
          {showUpload ? "Hide upload" : "Update snapshot"}
        </Button>
      </div>

      {showUpload ? (
        <FidelityPortfolioUpload onImported={() => setShowUpload(false)} />
      ) : null}

      <PositionsTable positions={positions} />
    </div>
  );
}

export default function PortfolioPage() {
  return (
    <PageWrapper
      title="Portfolio"
      description="Fidelity brokerage positions snapshot."
    >
      <PortfolioContent />
    </PageWrapper>
  );
}
