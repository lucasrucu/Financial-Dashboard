"use client";

import { useQuery } from "@tanstack/react-query";

import { useCurrencyStore } from "@/stores/currencyStore";
import { formatMoney } from "@/lib/currency";

async function fetchExchangeRate() {
  const response = await fetch("/api/exchange-rate");

  if (!response.ok) {
    throw new Error("Failed to fetch exchange rate");
  }

  return response.json() as Promise<{
    usd_to_pen: number;
    fetched_at: string;
    cached: boolean;
  }>;
}

export function useCurrency() {
  const currency = useCurrencyStore((state) => state.currency);
  const setCurrency = useCurrencyStore((state) => state.setCurrency);
  const toggleCurrency = useCurrencyStore((state) => state.toggleCurrency);

  const rateQuery = useQuery({
    queryKey: ["exchange-rate"],
    queryFn: fetchExchangeRate,
    staleTime: 24 * 60 * 60 * 1000,
  });

  const usdToPen = rateQuery.data?.usd_to_pen ?? 3.75;

  const formatAmount = (amountUsd: number) =>
    formatMoney(amountUsd, currency, usdToPen);

  return {
    currency,
    setCurrency,
    toggleCurrency,
    usdToPen,
    formatAmount,
    isLoadingRate: rateQuery.isLoading,
    rateError: rateQuery.error,
  };
}
