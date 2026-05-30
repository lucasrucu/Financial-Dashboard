import type { CurrencyCode } from "@/constants/currencies";

const DEFAULT_EXCHANGE_RATE_API_BASE = "https://api.frankfurter.app";

export function resolveExchangeRateApiBaseUrl(): string {
  const configured = process.env.EXCHANGE_RATE_API_URL?.trim();

  if (!configured) {
    return DEFAULT_EXCHANGE_RATE_API_BASE;
  }

  try {
    const parsed = new URL(
      configured.includes("://") ? configured : `https://${configured}`
    );
    return parsed.origin;
  } catch {
    return DEFAULT_EXCHANGE_RATE_API_BASE;
  }
}

export function buildExchangeRateUrl(from = "USD", to = "PEN"): string {
  return `${resolveExchangeRateApiBaseUrl()}/latest?from=${from}&to=${to}`;
}

export function buildHistoricalExchangeRateUrl(
  date: string,
  from = "USD",
  to = "PEN"
): string {
  return `${resolveExchangeRateApiBaseUrl()}/${date}?from=${from}&to=${to}`;
}

export const DEFAULT_USD_TO_PEN = 3.75;

export function convertPenToUsd(amountPen: number, usdToPen: number): number {
  if (usdToPen <= 0) {
    return amountPen / DEFAULT_USD_TO_PEN;
  }

  return amountPen / usdToPen;
}

export async function fetchHistoricalUsdToPen(
  date: string,
  cache = new Map<string, number>()
): Promise<number> {
  if (cache.has(date)) {
    return cache.get(date)!;
  }

  const fetchWithTimeout = (url: string) => {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 5000);
    return fetch(url, { signal: controller.signal }).finally(() => clearTimeout(id));
  };

  try {
    const response = await fetchWithTimeout(buildHistoricalExchangeRateUrl(date, "USD", "PEN"));

    if (response.ok) {
      const payload = (await response.json()) as { rates?: { PEN?: number } };
      const rate = payload.rates?.PEN;

      if (rate && rate > 0) {
        cache.set(date, rate);
        return rate;
      }
    }
  } catch {
    // Fall through to latest/fallback rate.
  }

  try {
    const latestResponse = await fetchWithTimeout(buildExchangeRateUrl("USD", "PEN"));

    if (latestResponse.ok) {
      const payload = (await latestResponse.json()) as { rates?: { PEN?: number } };
      const rate = payload.rates?.PEN ?? DEFAULT_USD_TO_PEN;
      cache.set(date, rate);
      return rate;
    }
  } catch {
    // Fall through to hardcoded fallback.
  }

  cache.set(date, DEFAULT_USD_TO_PEN);
  return DEFAULT_USD_TO_PEN;
}

export function convertUsd(
  amountUsd: number,
  currency: CurrencyCode,
  usdToPen: number
): number {
  if (currency === "USD") {
    return amountUsd;
  }

  return amountUsd * usdToPen;
}

export function formatMoney(
  amountUsd: number,
  currency: CurrencyCode,
  usdToPen: number
): string {
  const value = convertUsd(amountUsd, currency, usdToPen);

  if (currency === "PEN") {
    return new Intl.NumberFormat("es-PE", {
      style: "currency",
      currency: "PEN",
      maximumFractionDigits: 2,
    }).format(value);
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}

export function isRateFresh(fetchedAt: string, maxAgeHours = 24): boolean {
  const fetched = new Date(fetchedAt).getTime();
  const ageMs = Date.now() - fetched;
  return ageMs < maxAgeHours * 60 * 60 * 1000;
}
