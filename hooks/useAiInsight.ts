"use client";

import { useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { useAiInsightStore } from "@/stores/aiInsightStore";
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
  const stored = useAiInsightStore();

  useEffect(() => {
    if (stored.insight) {
      return;
    }

    fetchAiInsight(false)
      .then((data) => {
        stored.setInsight(data);
        queryClient.setQueryData(["ai-insight"], data);
      })
      .catch(() => {
        // optional fetch — ignore errors on mount
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const mutation = useMutation({
    mutationFn: (force: boolean) => fetchAiInsight(force),
    onSuccess: (data) => {
      stored.setInsight(data);
      queryClient.setQueryData(["ai-insight"], data);
    },
  });

  const insightResult =
    mutation.data ??
    (stored.insight
      ? {
          insight: stored.insight,
          cached: stored.cached,
          created_at: stored.created_at ?? "",
          period: stored.period ?? "",
        }
      : null);

  return {
    insight: insightResult,
    isLoading: mutation.isPending,
    error: mutation.error,
    analyze: (force = false) => mutation.mutate(force),
    clearInsight: () => {
      stored.clearInsight();
      queryClient.removeQueries({ queryKey: ["ai-insight"] });
    },
  };
}
