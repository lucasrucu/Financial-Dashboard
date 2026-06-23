"use client";

import { useQuery } from "@tanstack/react-query";

import type { TransferCandidatePair } from "@/lib/transfers";

async function fetchTransferSuggestions() {
  const response = await fetch("/api/transfers/suggestions");

  if (!response.ok) {
    throw new Error("Failed to fetch transfer suggestions");
  }

  return response.json() as Promise<{ pairs: TransferCandidatePair[] }>;
}

export function useTransferSuggestions() {
  return useQuery({
    queryKey: ["transfer-suggestions"],
    queryFn: fetchTransferSuggestions,
    staleTime: 5 * 60 * 1000,
  });
}
