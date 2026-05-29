export const DEFAULT_CURRENCY = "USD" as const;

export const SUPPORTED_CURRENCIES = ["USD", "PEN"] as const;

export type CurrencyCode = (typeof SUPPORTED_CURRENCIES)[number];

export const CURRENCY_CONFIG = {
  USD: {
    code: "USD" as const,
    symbol: "$",
    label: "US Dollar",
  },
  PEN: {
    code: "PEN" as const,
    symbol: "S/",
    label: "Peruvian Sol",
  },
} as const;
