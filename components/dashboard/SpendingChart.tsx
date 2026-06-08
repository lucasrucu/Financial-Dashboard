"use client";

import {
  CategoryPieChart,
  type CategoryDatum,
} from "@/components/dashboard/CategoryPieChart";

export function SpendingChart({ data }: { data: CategoryDatum[] }) {
  return (
    <CategoryPieChart
      title="Spending by Category"
      description="Current month breakdown"
      emptyMessage="No spending data yet. Connect a bank and sync transactions."
      totalLabel="Total spending"
      data={data}
    />
  );
}
