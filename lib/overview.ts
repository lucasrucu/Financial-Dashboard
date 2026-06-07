export interface OverviewStats {
  netWorth: number;
  spendingComparison: {
    currentSpending: number;
    previousSpending: number;
    delta: number;
    percentChange: number;
  };
  topCategories: Array<{
    categoryId: string;
    label: string;
    color: string;
    amount: number;
  }>;
  categoryBreakdown: Array<{
    categoryId: string;
    name: string;
    color: string;
    amount: number;
  }>;
  incomeBreakdown: Array<{
    categoryId: string;
    name: string;
    color: string;
    amount: number;
  }>;
}

export function formatMonthLabel(monthOffset = 0) {
  const date = new Date();
  date.setDate(1);
  date.setMonth(date.getMonth() + monthOffset);
  return date.toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

export async function fetchOverviewStats(monthOffset = 0): Promise<OverviewStats> {
  const response = await fetch(
    `/api/overview?monthOffset=${encodeURIComponent(String(monthOffset))}`
  );
  if (!response.ok) {
    throw new Error("Failed to fetch overview stats");
  }
  return response.json() as Promise<OverviewStats>;
}
