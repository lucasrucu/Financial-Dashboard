import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

import {
  SPENDING_CATEGORIES,
  type SpendingCategoryId,
} from "@/constants/categories";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const PLAID_CATEGORY_MAP: Record<string, SpendingCategoryId> = {
  FOOD_AND_DRINK: "food",
  TRANSPORTATION: "transport",
  GENERAL_MERCHANDISE: "shopping",
  ENTERTAINMENT: "entertainment",
  PERSONAL_CARE: "health",
  MEDICAL: "health",
  RENT_AND_UTILITIES: "rent",
  GENERAL_SERVICES: "subscriptions",
  TRAVEL: "entertainment",
  TRANSFER_IN: "savings",
  TRANSFER_OUT: "savings",
  INCOME: "savings",
  LOAN_PAYMENTS: "rent",
  BANK_FEES: "other",
  GOVERNMENT_AND_NON_PROFIT: "other",
  HOME_IMPROVEMENT: "rent",
  RECREATION: "entertainment",
};

export function mapPlaidCategory(
  plaidCategory: string[] | null | undefined
): SpendingCategoryId {
  if (!plaidCategory?.length) {
    return "other";
  }

  const primary = plaidCategory[0]?.toUpperCase().replace(/\s+/g, "_");

  if (primary && PLAID_CATEGORY_MAP[primary]) {
    return PLAID_CATEGORY_MAP[primary];
  }

  const joined = plaidCategory.join(" ").toLowerCase();

  if (joined.includes("food") || joined.includes("restaurant")) {
    return "food";
  }

  if (joined.includes("transport") || joined.includes("gas")) {
    return "transport";
  }

  if (joined.includes("subscription") || joined.includes("service")) {
    return "subscriptions";
  }

  if (joined.includes("shop") || joined.includes("merchandise")) {
    return "shopping";
  }

  if (joined.includes("rent") || joined.includes("housing")) {
    return "rent";
  }

  if (joined.includes("health") || joined.includes("fitness")) {
    return "health";
  }

  if (joined.includes("invest")) {
    return "investing";
  }

  if (joined.includes("transfer") || joined.includes("saving")) {
    return "savings";
  }

  return "other";
}

export function getCategoryById(categoryId: string) {
  return SPENDING_CATEGORIES.find((category) => category.id === categoryId);
}

export function formatDate(date: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(`${date}T00:00:00`));
}

export function formatRelativeTime(dateString: string | null) {
  if (!dateString) {
    return "Never";
  }

  const date = new Date(dateString);
  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));

  if (diffMinutes < 1) {
    return "Just now";
  }

  if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  }

  const diffHours = Math.floor(diffMinutes / 60);

  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

export function formatPercent(value: number) {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}%`;
}
