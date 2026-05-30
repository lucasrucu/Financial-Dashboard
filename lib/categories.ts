import type { SupabaseClient } from "@supabase/supabase-js";

import { SPENDING_CATEGORIES } from "@/constants/categories";

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

  const rows = SPENDING_CATEGORIES.map((category) => ({
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
