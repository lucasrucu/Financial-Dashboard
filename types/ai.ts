export interface AiAnalysisPayload {
  period: string;
  totalIncome: number;
  totalSpending: number;
  topCategories: { name: string; amount: number }[];
  biggestMerchants: { name: string; amount: number }[];
  savingsRate: number;
  goals: { name: string; progress: number }[];
  flaggedTransactions: string[];
}

export interface AiInsightResponse {
  roast: string;
  wins: string[];
  actions: string[];
  flagged: string[];
  allocations: Record<string, string>;
}

export interface AiCache {
  response_json: AiInsightResponse;
  created_at: string;
  period: string;
}
