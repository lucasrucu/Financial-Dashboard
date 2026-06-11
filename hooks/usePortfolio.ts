import { useQuery } from "@tanstack/react-query";

import type { FidelityPortfolioData } from "@/types/fidelity";

async function fetchPortfolio(): Promise<FidelityPortfolioData | null> {
  const response = await fetch("/api/portfolio");

  if (!response.ok) {
    throw new Error("Failed to fetch portfolio");
  }

  const data = (await response.json()) as { portfolio: FidelityPortfolioData | null };
  return data.portfolio;
}

export function usePortfolio() {
  return useQuery({
    queryKey: ["portfolio"],
    queryFn: fetchPortfolio,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
}
