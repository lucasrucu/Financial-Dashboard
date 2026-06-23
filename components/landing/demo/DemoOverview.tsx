"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DemoCategoryChart } from "@/components/landing/demo/DemoCategoryChart";
import {
  DEMO_INCOME,
  DEMO_INCOME_USD,
  DEMO_MONTH_LABEL,
  DEMO_NET_WORTH_USD,
  DEMO_SPENDING,
  DEMO_SPENDING_USD,
} from "@/components/landing/demo/sampleData";

const formatUsd = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);

function StatCard({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className={`text-2xl font-semibold tabular-nums ${accent ?? ""}`}>{value}</p>
      </CardContent>
    </Card>
  );
}

export function DemoOverview() {
  const saved = DEMO_INCOME_USD - DEMO_SPENDING_USD;
  const savingsRate = Math.round((saved / DEMO_INCOME_USD) * 100);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Net worth" value={formatUsd(DEMO_NET_WORTH_USD)} />
        <StatCard label={`Income · ${DEMO_MONTH_LABEL}`} value={formatUsd(DEMO_INCOME_USD)} accent="text-positive" />
        <StatCard label={`Spending · ${DEMO_MONTH_LABEL}`} value={formatUsd(DEMO_SPENDING_USD)} accent="text-negative" />
      </div>

      <Card className="border-border bg-card">
        <CardContent className="flex flex-wrap items-center justify-between gap-2 py-4">
          <p className="text-sm text-muted-foreground">
            You saved <span className="font-semibold text-foreground">{formatUsd(saved)}</span> this month
          </p>
          <p className="text-sm font-semibold text-positive">{savingsRate}% savings rate</p>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <DemoCategoryChart
          title="Spending by Category"
          description={`${DEMO_MONTH_LABEL} breakdown`}
          totalLabel="Total spending"
          data={DEMO_SPENDING}
        />
        <DemoCategoryChart
          title="Income by Category"
          description={`${DEMO_MONTH_LABEL} breakdown`}
          totalLabel="Total income"
          data={DEMO_INCOME}
        />
      </div>
    </div>
  );
}
