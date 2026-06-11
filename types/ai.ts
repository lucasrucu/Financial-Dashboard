export interface AiPortfolioPosition {
  ticker: string;
  valueUsd: number;
  gainUsd: number | null;
  gainPct: number | null;
  isMoneyMarket: boolean;
}

export interface AiAnalysisPayload {
  period: string;
  totalIncome: number;
  totalSpending: number;
  topCategories: { name: string; amount: number }[];
  biggestMerchants: { name: string; amount: number }[];
  savingsRate: number;
  goals: { name: string; progress: number }[];
  flaggedTransactions: string[];
  portfolio: {
    totalValueUsd: number;
    totalGainUsd: number | null;
    snapshotDate: string;
    positions: AiPortfolioPosition[];
  } | null;
}

export interface AiPortfolioMove {
  ticker: string;
  action: "hold" | "buy" | "sell" | "watch";
  rationale: string;
}

export interface AiInsightResponse {
  roast: string;
  wins: string[];
  actions: string[];
  flagged: string[];
  allocations: Record<string, string>;
  portfolio?: {
    summary: string;
    moves: AiPortfolioMove[];
  };
}

export interface AiCache {
  response_json: AiInsightResponse;
  created_at: string;
  period: string;
}
