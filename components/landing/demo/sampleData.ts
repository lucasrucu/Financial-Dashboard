// Hardcoded sample data for the public landing-page demo. Typed against the
// real domain types so the demo stays honest about the product's data shapes.
// Nothing here touches the database or any API — the demo renders entirely
// from these constants.

import type { CategoryDatum } from "@/components/dashboard/CategoryPieChart";
import type { FidelityStockPosition } from "@/types/fidelity";
import type { AiInsightResponse } from "@/types/ai";

export const DEMO_MONTH_LABEL = "June 2026";

export const DEMO_NET_WORTH_USD = 48720;
export const DEMO_INCOME_USD = 6200;
export const DEMO_SPENDING_USD = 3845;

export const DEMO_SPENDING: CategoryDatum[] = [
  { categoryId: "rent", name: "Rent & Housing", color: "#6366f1", amount: 1650 },
  { categoryId: "food", name: "Food & Dining", color: "#f97316", amount: 720 },
  { categoryId: "transport", name: "Transport", color: "#3b82f6", amount: 340 },
  { categoryId: "shopping", name: "Shopping", color: "#f59e0b", amount: 415 },
  { categoryId: "subscriptions", name: "Subscriptions", color: "#8b5cf6", amount: 96 },
  { categoryId: "health", name: "Health & Fitness", color: "#10b981", amount: 124 },
  { categoryId: "entertainment", name: "Entertainment", color: "#ec4899", amount: 180 },
  { categoryId: "other", name: "Other", color: "#94a3b8", amount: 320 },
];

export const DEMO_INCOME: CategoryDatum[] = [
  { categoryId: "salary", name: "Salary / Paycheck", color: "#16a34a", amount: 5600 },
  { categoryId: "other_income", name: "Other Income", color: "#06b6d4", amount: 600 },
];

export interface DemoTransaction {
  id: string;
  date: string;
  name: string;
  amountUsd: number; // negative = spending, positive = income
  source: "plaid" | "bcp";
  category: { label: string; icon: string; color: string };
}

export const DEMO_TRANSACTIONS: DemoTransaction[] = [
  {
    id: "t1",
    date: "2026-06-21",
    name: "Whole Foods Market",
    amountUsd: -84.32,
    source: "plaid",
    category: { label: "Food & Dining", icon: "🍔", color: "#f97316" },
  },
  {
    id: "t2",
    date: "2026-06-20",
    name: "Acme Corp Payroll",
    amountUsd: 2800.0,
    source: "plaid",
    category: { label: "Salary / Paycheck", icon: "💼", color: "#16a34a" },
  },
  {
    id: "t3",
    date: "2026-06-19",
    name: "Uber Trip",
    amountUsd: -18.4,
    source: "plaid",
    category: { label: "Transport", icon: "🚗", color: "#3b82f6" },
  },
  {
    id: "t4",
    date: "2026-06-18",
    name: "Plaza Vea (BCP)",
    amountUsd: -42.15,
    source: "bcp",
    category: { label: "Food & Dining", icon: "🍔", color: "#f97316" },
  },
  {
    id: "t5",
    date: "2026-06-17",
    name: "Netflix",
    amountUsd: -15.99,
    source: "plaid",
    category: { label: "Subscriptions", icon: "📱", color: "#8b5cf6" },
  },
  {
    id: "t6",
    date: "2026-06-16",
    name: "Apartment Rent",
    amountUsd: -1650.0,
    source: "plaid",
    category: { label: "Rent & Housing", icon: "🏠", color: "#6366f1" },
  },
  {
    id: "t7",
    date: "2026-06-15",
    name: "Equinox Membership",
    amountUsd: -52.0,
    source: "plaid",
    category: { label: "Health & Fitness", icon: "💪", color: "#10b981" },
  },
  {
    id: "t8",
    date: "2026-06-14",
    name: "Interbank Transfer (BCP)",
    amountUsd: -120.5,
    source: "bcp",
    category: { label: "Savings / Transfers", icon: "💰", color: "#14b8a6" },
  },
];

// Minimal stand-in fields the demo positions table reads. user_id / snapshot_id
// are required by the type but irrelevant to display, so they get placeholders.
function demoPosition(
  p: Pick<
    FidelityStockPosition,
    | "ticker"
    | "description"
    | "quantity"
    | "price_usd"
    | "current_value_usd"
    | "total_gain_usd"
    | "total_gain_pct"
    | "cost_basis_usd"
    | "is_money_market"
  > & { id: string }
): FidelityStockPosition {
  return {
    user_id: "demo",
    snapshot_id: "demo",
    today_gain_usd: null,
    today_gain_pct: null,
    avg_cost_basis_usd: null,
    ...p,
  };
}

export const DEMO_PORTFOLIO_VALUE_USD = 31480;
export const DEMO_PORTFOLIO_GAIN_USD = 4920;

export const DEMO_POSITIONS: FidelityStockPosition[] = [
  demoPosition({
    id: "p1",
    ticker: "VTI",
    description: "Vanguard Total Stock Market ETF",
    quantity: 62,
    price_usd: 268.4,
    current_value_usd: 16640.8,
    cost_basis_usd: 13950,
    total_gain_usd: 2690.8,
    total_gain_pct: 19.29,
    is_money_market: false,
  }),
  demoPosition({
    id: "p2",
    ticker: "AAPL",
    description: "Apple Inc.",
    quantity: 24,
    price_usd: 212.6,
    current_value_usd: 5102.4,
    cost_basis_usd: 4080,
    total_gain_usd: 1022.4,
    total_gain_pct: 25.06,
    is_money_market: false,
  }),
  demoPosition({
    id: "p3",
    ticker: "MSFT",
    description: "Microsoft Corp.",
    quantity: 9,
    price_usd: 448.2,
    current_value_usd: 4033.8,
    cost_basis_usd: 3510,
    total_gain_usd: 523.8,
    total_gain_pct: 14.92,
    is_money_market: false,
  }),
  demoPosition({
    id: "p4",
    ticker: "NVDA",
    description: "NVIDIA Corp.",
    quantity: 14,
    price_usd: 132.9,
    current_value_usd: 1860.6,
    cost_basis_usd: 1190,
    total_gain_usd: 670.6,
    total_gain_pct: 56.35,
    is_money_market: false,
  }),
  demoPosition({
    id: "p5",
    ticker: "SPAXX",
    description: "Fidelity Government Money Market",
    quantity: null,
    price_usd: null,
    current_value_usd: 3842.4,
    cost_basis_usd: null,
    total_gain_usd: null,
    total_gain_pct: null,
    is_money_market: true,
  }),
];

export const DEMO_AI_INSIGHT: AiInsightResponse = {
  roast:
    "$96 a month on subscriptions you forgot you had, and a 38% savings rate that's honestly carrying this whole portfolio. The spending is disciplined — but that money-market cash pile is just sitting there blushing while inflation eats it.",
  wins: [
    "38% savings rate this month — well above your 25% target.",
    "Rent is 27% of income, comfortably inside the 30% rule.",
    "No new credit-card interest charges this period.",
  ],
  actions: [
    "Sweep the $3,842 in SPAXX into VTI to put idle cash to work.",
    "Cancel one of the two overlapping streaming subscriptions.",
    "Round up the monthly transfer to your emergency fund to $700.",
  ],
  flagged: [
    "$52 Equinox charge — second gym membership this quarter?",
    "Duplicate $15.99 streaming charges on the 17th and 18th.",
  ],
  allocations: {
    "Emergency Fund": "On track — 4.2 months of expenses banked.",
    "House Down Payment": "Add $400/mo to hit the 2028 target.",
  },
  portfolio: {
    summary:
      "Equity-heavy and well diversified, but ~12% of the book is idle cash dragging on returns.",
    moves: [
      { ticker: "VTI", action: "hold", rationale: "Core holding, low cost, broad exposure. Keep accumulating." },
      { ticker: "NVDA", action: "watch", rationale: "Up 56% — strong, but a single name now skews the book. Watch the weight." },
      { ticker: "SPAXX", action: "sell", rationale: "Idle cash. Redeploy into the index unless earmarked for a near-term goal." },
      { ticker: "AAPL", action: "hold", rationale: "Healthy gain, reasonable weight. No action needed." },
    ],
  },
};
