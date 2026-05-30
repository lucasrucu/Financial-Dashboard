"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";

import type { TransactionFilters, TransactionListResponse } from "@/types/transaction";

export type { TransactionRow } from "@/types/transaction";

async function fetchTransactions(filters: TransactionFilters) {
  const params = new URLSearchParams();

  if (filters.startDate) {
    params.set("startDate", filters.startDate);
  }

  if (filters.endDate) {
    params.set("endDate", filters.endDate);
  }

  if (filters.categoryId) {
    params.set("categoryId", filters.categoryId);
  }

  if (filters.search) {
    params.set("search", filters.search);
  }

  if (filters.accountId) {
    params.set("accountId", filters.accountId);
  }

  if (filters.sortBy) {
    params.set("sortBy", filters.sortBy);
  }

  if (filters.sortOrder) {
    params.set("sortOrder", filters.sortOrder);
  }

  if (filters.page) {
    params.set("page", String(filters.page));
  }

  if (filters.pageSize) {
    params.set("pageSize", String(filters.pageSize));
  }

  const response = await fetch(`/api/plaid/transactions?${params.toString()}`);

  if (!response.ok) {
    throw new Error("Failed to fetch transactions");
  }

  return response.json() as Promise<TransactionListResponse>;
}

export function useTransactions(filters: TransactionFilters) {
  return useQuery({
    queryKey: ["transactions", filters],
    queryFn: () => fetchTransactions(filters),
    placeholderData: keepPreviousData,
  });
}

export async function updateTransactionCategory(id: string, categoryId: string) {
  const response = await fetch("/api/plaid/transactions", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, category_id: categoryId }),
  });

  if (!response.ok) {
    throw new Error("Failed to update category");
  }

  return response.json();
}
