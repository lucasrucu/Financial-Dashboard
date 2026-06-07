import type { CategoryId } from "@/constants/categories";

const BCP_CATEGORY_RULES: Array<{ pattern: RegExp; categoryId: CategoryId }> = [
  { pattern: /sueldo|nomina|nómina|payroll|salary|haberes/i, categoryId: "salary" },
  { pattern: /spotify|netflix|disney|prime/i, categoryId: "subscriptions" },
  { pattern: /uber|pyu\*uber|dlc\*rides|viajes/i, categoryId: "transport" },
  { pattern: /pedidosya|trattori|petrosur|brisa|market|restaurant/i, categoryId: "food" },
  { pattern: /movie time|yc-pyu/i, categoryId: "entertainment" },
  { pattern: /smart fit|gym|fitness/i, categoryId: "health" },
  { pattern: /plin|yape|pago yape|abon plin/i, categoryId: "savings" },
  { pattern: /kambista|venta usd/i, categoryId: "savings" },
  { pattern: /impuesto|itf|mant\. cuenta/i, categoryId: "other" },
];

export function mapBcpCategory(description: string): CategoryId {
  for (const rule of BCP_CATEGORY_RULES) {
    if (rule.pattern.test(description)) {
      return rule.categoryId;
    }
  }

  return "other";
}
