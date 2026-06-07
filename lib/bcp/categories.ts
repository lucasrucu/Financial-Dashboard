import type { CategoryId } from "@/constants/categories";

// High-confidence merchant/salary patterns only. Everything else stays "other"
// until the user recategorizes manually or via AI.
const BCP_CATEGORY_RULES: Array<{ pattern: RegExp; categoryId: CategoryId }> = [
  { pattern: /sueldo|nomina|nómina|payroll|salary|haberes/i, categoryId: "salary" },
  { pattern: /spotify|netflix|disney|prime video/i, categoryId: "subscriptions" },
  { pattern: /pyu\*uber|dlc\*uber|dlc\*rides/i, categoryId: "transport" },
  { pattern: /pedidosya/i, categoryId: "food" },
  { pattern: /movie time/i, categoryId: "entertainment" },
  { pattern: /smart fit/i, categoryId: "health" },
];

export function mapBcpCategory(description: string): CategoryId {
  for (const rule of BCP_CATEGORY_RULES) {
    if (rule.pattern.test(description)) {
      return rule.categoryId;
    }
  }

  return "other";
}
