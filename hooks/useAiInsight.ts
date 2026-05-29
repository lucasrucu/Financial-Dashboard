"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { AiInsightResponse } from "@/types/ai";

interface AiInsightResult {
  insight: AiInsightResponse;
  cached: boolean;
  created_at: string;
  period: string;
}

async function fetchAiInsight(force = false) {
  const response = await fetch(
    `/api/ai/analyze${force ? "?force=true" : ""}`,
    { method: "POST" }
  );

  if (!response.ok) {
    const payload = (await response.json()) as { error?: string };
    throw new Error(payload.error ?? "Failed to analyze finances");
  }

  return response.json() as Promise<AiInsightResult>;
}

export function useAiInsight() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["ai-insight"],
    queryFn: () => fetchAiInsight(false),
    enabled: false,
  });

  const mutation = useMutation({
    mutationFn: (force: boolean) => fetchAiInsight(force),
    onSuccess: (data) => {
      queryClient.setQueryData(["ai-insight"], data);
    },
  });

  return {
    insight: query.data ?? mutation.data,
    isLoading: mutation.isPending,
    error: mutation.error ?? query.error,
    analyze: (force = false) => mutation.mutate(force),
  };
}
