export interface ForecastPoint {
  month: string; // YYYY-MM
  label: string; // e.g. "Jan 2026"
  revenue: number | null; // historical actual, null for projected months
  netProfit: number | null;
  projectedRevenue: number | null; // projected, null for historical months
  projectedNetProfit: number | null;
}

export interface ForecastData {
  points: ForecastPoint[];
  historyMonths: number;
  projectionMonths: number;
  hasEnoughData: boolean; // false when < minimum history months
  method: "linear-regression";
}
