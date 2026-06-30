export type BudgetPeriod = "monthly";

export interface Budget {
  id: string;
  category: string;
  amount: number;
  period: BudgetPeriod;
  created_at?: string;
}

export interface BudgetCreatePayload {
  category: string;
  amount: number;
  period?: BudgetPeriod;
}

export interface BudgetUpdatePayload {
  category?: string;
  amount?: number;
  period?: BudgetPeriod;
}

// Spend-vs-budget comparison for a single category in the current month.
export interface BudgetProgress {
  budgetId: string;
  categoryId: string;
  label: string;
  color: string;
  amount: number; // budget limit
  spent: number; // actual spending this month
  remaining: number; // amount - spent (can be negative)
  percentUsed: number; // 0-100+, spent / amount
  overBudget: boolean;
}

export interface BudgetSummary {
  totalBudgets: number;
  overLimitCount: number;
}
