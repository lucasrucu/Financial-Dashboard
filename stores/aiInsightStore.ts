"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

import type { AiInsightResponse } from "@/types/ai";

interface AiInsightState {
  insight: AiInsightResponse | null;
  cached: boolean;
  created_at: string | null;
  period: string | null;
  setInsight: (payload: {
    insight: AiInsightResponse;
    cached: boolean;
    created_at: string;
    period: string;
  }) => void;
  clearInsight: () => void;
}

export const useAiInsightStore = create<AiInsightState>()(
  persist(
    (set) => ({
      insight: null,
      cached: false,
      created_at: null,
      period: null,
      setInsight: (payload) =>
        set({
          insight: payload.insight,
          cached: payload.cached,
          created_at: payload.created_at,
          period: payload.period,
        }),
      clearInsight: () =>
        set({
          insight: null,
          cached: false,
          created_at: null,
          period: null,
        }),
    }),
    {
      name: "financial-dashboard-ai-insight",
      storage: createJSONStorage(() => sessionStorage),
    }
  )
);
