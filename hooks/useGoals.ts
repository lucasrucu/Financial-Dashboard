"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { Goal, GoalUpdatePayload } from "@/types/goal";

async function fetchGoals() {
  const response = await fetch("/api/goals");

  if (!response.ok) {
    throw new Error("Failed to fetch goals");
  }

  return response.json() as Promise<{ goals: Goal[] }>;
}

async function updateGoal(payload: GoalUpdatePayload & { id: string }) {
  const response = await fetch("/api/goals", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error("Failed to update goal");
  }

  return response.json() as Promise<{ goal: Goal }>;
}

export function useGoals() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["goals"],
    queryFn: async () => {
      const data = await fetchGoals();
      return data.goals;
    },
  });

  const mutation = useMutation({
    mutationFn: updateGoal,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["goals"] });
    },
  });

  return {
    goals: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    updateGoal: mutation.mutateAsync,
    isUpdating: mutation.isPending,
  };
}
