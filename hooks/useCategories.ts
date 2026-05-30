"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { Category, CategoryCreatePayload, CategoryUpdatePayload } from "@/types/category";

async function fetchCategories() {
  const response = await fetch("/api/categories");

  if (!response.ok) {
    throw new Error("Failed to fetch categories");
  }

  const payload = (await response.json()) as { categories: Category[] };
  return payload.categories;
}

export function useCategories() {
  return useQuery({
    queryKey: ["categories"],
    queryFn: fetchCategories,
    staleTime: 60_000,
  });
}

export function useCreateCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CategoryCreatePayload) => {
      const response = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const body = (await response.json()) as { error?: string };
        throw new Error(body.error ?? "Failed to create category");
      }

      return response.json() as Promise<{ category: Category }>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      queryClient.invalidateQueries({ queryKey: ["overview"] });
    },
  });
}

export function useUpdateCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...payload }: CategoryUpdatePayload & { id: string }) => {
      const response = await fetch(`/api/categories/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const body = (await response.json()) as { error?: string };
        throw new Error(body.error ?? "Failed to update category");
      }

      return response.json() as Promise<{ category: Category }>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      queryClient.invalidateQueries({ queryKey: ["overview"] });
    },
  });
}

export function useDeleteCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/categories/${id}`, { method: "DELETE" });

      if (!response.ok) {
        const body = (await response.json()) as { error?: string };
        throw new Error(body.error ?? "Failed to delete category");
      }

      return response.json() as Promise<{ deleted: string }>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["overview"] });
    },
  });
}

export function getCategoryById(categories: Category[] | undefined, categoryId: string) {
  return categories?.find((category) => category.id === categoryId);
}
