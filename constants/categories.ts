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

export type SpendingCategoryId = (typeof SPENDING_CATEGORIES)[number]["id"];

export type SpendingCategory = (typeof SPENDING_CATEGORIES)[number];
