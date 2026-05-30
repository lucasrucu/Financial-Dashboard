"use client";

import { useQuery } from "@tanstack/react-query";

interface AccountItem {
  id: string;
  name: string;
  mask: string | null;
}

interface AccountsResponse {
  accounts: AccountItem[];
}

async function fetchAccounts() {
  const response = await fetch("/api/accounts");
  if (!response.ok) {
    throw new Error("Failed to fetch accounts");
  }
  return response.json() as Promise<AccountsResponse>;
}

export function useAccounts() {
  return useQuery({
    queryKey: ["accounts"],
    queryFn: fetchAccounts,
    select: (data) => data.accounts,
  });
}
