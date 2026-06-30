"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type {
  Budget,
  BudgetCreatePayload,
  BudgetProgress,
  BudgetSummary,
  BudgetUpdatePayload,
} from "@/types/budget";

async function fetchBudgets() {
  const response = await fetch("/api/budgets");

  if (!response.ok) {
    throw new Error("Failed to fetch budgets");
  }

  const payload = (await response.json()) as { budgets: Budget[] };
  return payload.budgets;
}

export function useBudgets() {
  return useQuery({
    queryKey: ["budgets"],
    queryFn: fetchBudgets,
  });
}

async function fetchBudgetProgress(monthOffset: number) {
  const response = await fetch(
    `/api/budgets/progress?monthOffset=${encodeURIComponent(String(monthOffset))}`
  );

  if (!response.ok) {
    throw new Error("Failed to fetch budget progress");
  }

  return response.json() as Promise<{ progress: BudgetProgress[]; summary: BudgetSummary }>;
}

export function useBudgetProgress(monthOffset = 0) {
  return useQuery({
    queryKey: ["budget-progress", monthOffset],
    queryFn: () => fetchBudgetProgress(monthOffset),
  });
}

function invalidateBudgetQueries(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ["budgets"] });
  queryClient.invalidateQueries({ queryKey: ["budget-progress"] });
  queryClient.invalidateQueries({ queryKey: ["overview"] });
}

export function useCreateBudget() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: BudgetCreatePayload) => {
      const response = await fetch("/api/budgets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const body = (await response.json()) as { error?: string };
        throw new Error(body.error ?? "Failed to create budget");
      }

      return response.json() as Promise<{ budget: Budget }>;
    },
    onSuccess: () => invalidateBudgetQueries(queryClient),
  });
}

export function useUpdateBudget() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...payload }: BudgetUpdatePayload & { id: string }) => {
      const response = await fetch(`/api/budgets/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const body = (await response.json()) as { error?: string };
        throw new Error(body.error ?? "Failed to update budget");
      }

      return response.json() as Promise<{ budget: Budget }>;
    },
    onSuccess: () => invalidateBudgetQueries(queryClient),
  });
}

export function useDeleteBudget() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/budgets/${id}`, { method: "DELETE" });

      if (!response.ok) {
        const body = (await response.json()) as { error?: string };
        throw new Error(body.error ?? "Failed to delete budget");
      }

      return response.json() as Promise<{ deleted: string }>;
    },
    onSuccess: () => invalidateBudgetQueries(queryClient),
  });
}
