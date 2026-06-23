export const SPENDING_CATEGORIES = [
  { id: "food", label: "Food & Dining", icon: "🍔", color: "#f97316" },
  { id: "transport", label: "Transport", icon: "🚗", color: "#3b82f6" },
  { id: "subscriptions", label: "Subscriptions", icon: "📱", color: "#8b5cf6" },
  { id: "entertainment", label: "Entertainment", icon: "🎮", color: "#ec4899" },
  { id: "health", label: "Health & Fitness", icon: "💪", color: "#10b981" },
  { id: "shopping", label: "Shopping", icon: "🛍️", color: "#f59e0b" },
  { id: "rent", label: "Rent & Housing", icon: "🏠", color: "#6366f1" },
  { id: "savings", label: "Savings / Transfers", icon: "💰", color: "#14b8a6" },
  { id: "investing", label: "Investing", icon: "📈", color: "#22c55e" },
  { id: "other", label: "Other", icon: "📦", color: "#94a3b8" },
] as const;

export const INCOME_CATEGORIES = [
  { id: "salary", label: "Salary / Paycheck", icon: "💼", color: "#16a34a" },
  { id: "other_income", label: "Other Income", icon: "📥", color: "#06b6d4" },
] as const;

// Money moved between the user's own accounts. Neither income nor spending —
// excluded from all totals (see EXCLUDED_FROM_TOTALS_CATEGORY_IDS). The fee/FX
// loss on a transfer is still reflected in net worth via account balances.
export const TRANSFER_CATEGORY_ID = "transfer";

export const TRANSFER_CATEGORIES = [
  { id: TRANSFER_CATEGORY_ID, label: "Transfer", icon: "🔁", color: "#64748b" },
] as const;

export const DEFAULT_CATEGORIES = [
  ...SPENDING_CATEGORIES,
  ...INCOME_CATEGORIES,
  ...TRANSFER_CATEGORIES,
] as const;

// Category ids whose transactions are excluded from income, spending, category
// breakdowns, and the AI analysis payload. Single source of truth.
export const EXCLUDED_FROM_TOTALS_CATEGORY_IDS = new Set<string>([TRANSFER_CATEGORY_ID]);

export type SpendingCategoryId = (typeof SPENDING_CATEGORIES)[number]["id"];
export type IncomeCategoryId = (typeof INCOME_CATEGORIES)[number]["id"];
export type TransferCategoryId = (typeof TRANSFER_CATEGORIES)[number]["id"];
export type CategoryId = (typeof DEFAULT_CATEGORIES)[number]["id"];

export type SpendingCategory = (typeof SPENDING_CATEGORIES)[number];
export type IncomeCategory = (typeof INCOME_CATEGORIES)[number];
export type DefaultCategory = (typeof DEFAULT_CATEGORIES)[number];
