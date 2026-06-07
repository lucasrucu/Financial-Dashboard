import type { SupabaseClient } from "@supabase/supabase-js";

import { DEFAULT_CATEGORIES } from "@/constants/categories";

export interface Category {
  id: string;
  user_id: string;
  label: string;
  icon: string;
  color: string;
  is_system: boolean;
  created_at: string;
}

const FALLBACK_COLORS = [
  "#f97316",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
  "#10b981",
  "#f59e0b",
  "#6366f1",
  "#14b8a6",
  "#22c55e",
  "#94a3b8",
  "#ef4444",
  "#06b6d4",
];

export async function seedCategoriesIfEmpty(
  supabase: SupabaseClient,
  userId: string
): Promise<Category[]> {
  const { data: existing, error } = await supabase
    .from("categories")
    .select("*")
    .eq("user_id", userId)
    .order("label");

  if (error) {
    throw new Error(error.message);
  }

  if (existing?.length) {
    return existing as Category[];
  }

  const rows = DEFAULT_CATEGORIES.map((category) => ({
    id: category.id,
    user_id: userId,
    label: category.label,
    icon: category.icon,
    color: category.color,
    is_system: category.id === "other",
  }));

  const { data: inserted, error: insertError } = await supabase
    .from("categories")
    .insert(rows)
    .select("*");

  if (insertError) {
    throw new Error(insertError.message);
  }

  return (inserted ?? []) as Category[];
}

export async function ensureDefaultCategories(
  supabase: SupabaseClient,
  userId: string
): Promise<Category[]> {
  const existing = await seedCategoriesIfEmpty(supabase, userId);
  const existingIds = new Set(existing.map((category) => category.id));
  const missing = DEFAULT_CATEGORIES.filter((category) => !existingIds.has(category.id));

  if (!missing.length) {
    return existing;
  }

  const rows = missing.map((category) => ({
    id: category.id,
    user_id: userId,
    label: category.label,
    icon: category.icon,
    color: category.color,
    is_system: category.id === "other",
  }));

  const { data: inserted, error: insertError } = await supabase
    .from("categories")
    .insert(rows)
    .select("*");

  if (insertError) {
    throw new Error(insertError.message);
  }

  return [...existing, ...((inserted ?? []) as Category[])].sort((a, b) =>
    a.label.localeCompare(b.label)
  );
}

function isPlaidIncomeCategory(plaidCategory: string[] | null | undefined) {
  const primary = plaidCategory?.[0]?.toUpperCase().replace(/\s+/g, "_");
  return primary === "INCOME";
}

export async function backfillIncomeCategories(
  supabase: SupabaseClient,
  userId: string
) {
  const { data: rows, error } = await supabase
    .from("transactions")
    .select("id, plaid_category")
    .eq("user_id", userId)
    .lt("amount_usd", 0)
    .eq("category_source", "auto");

  if (error) {
    throw new Error(error.message);
  }

  const incomeIds = (rows ?? [])
    .filter((row) => isPlaidIncomeCategory(row.plaid_category))
    .map((row) => row.id);

  if (!incomeIds.length) {
    return;
  }

  const { error: updateError } = await supabase
    .from("transactions")
    .update({ category_id: "salary" })
    .in("id", incomeIds);

  if (updateError) {
    throw new Error(updateError.message);
  }
}

export async function suggestCategoryColor(label: string, usedColors: string[] = []) {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (apiKey) {
    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 32,
          messages: [
            {
              role: "user",
              content: `Return only a single hex color (e.g. #3b82f6) that fits a spending category named "${label}". No other text.`,
            },
          ],
        }),
      });

      if (response.ok) {
        const payload = (await response.json()) as {
          content?: Array<{ type: string; text?: string }>;
        };
        const text = payload.content?.find((block) => block.type === "text")?.text?.trim();
        const match = text?.match(/#[0-9a-fA-F]{6}/);

        if (match && !usedColors.includes(match[0].toLowerCase())) {
          return match[0].toLowerCase();
        }
      }
    } catch {
      // fall through to palette
    }
  }

  const available = FALLBACK_COLORS.find(
    (color) => !usedColors.map((c) => c.toLowerCase()).includes(color.toLowerCase())
  );

  return available ?? FALLBACK_COLORS[Math.floor(Math.random() * FALLBACK_COLORS.length)];
}

export function buildCategoryMap(categories: Category[]) {
  return new Map(categories.map((category) => [category.id, category]));
}

export function resolveCategoryLabel(
  categoryId: string,
  categoryMap: Map<string, Category>
) {
  return categoryMap.get(categoryId)?.label ?? categoryId;
}

export function resolveCategoryColor(
  categoryId: string,
  categoryMap: Map<string, Category>
) {
  return categoryMap.get(categoryId)?.color ?? "#94a3b8";
}
