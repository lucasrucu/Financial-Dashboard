"use client";

import {
  CategoryPieChart,
  type CategoryDatum,
} from "@/components/dashboard/CategoryPieChart";

export function IncomeChart({ data }: { data: CategoryDatum[] }) {
  return (
    <CategoryPieChart
      title="Income by Category"
      description="Current month breakdown"
      emptyMessage="No income recorded this month yet."
      data={data}
    />
  );
}
