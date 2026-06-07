"use client";

import { useCallback, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Loader2, Pencil, RefreshCw, X } from "lucide-react";

import { PlaidLink } from "@/components/dashboard/PlaidLink";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useCurrency } from "@/hooks/useCurrency";
import { convertPenToUsd } from "@/lib/currency";
import { formatDate, formatRelativeTime } from "@/lib/utils";

interface AccountItem {
  id: string;
  name: string;
  balance_usd: number;
  effective_balance_usd: number;
  balance_anchor_usd: number | null;
  balance_anchor_date: string | null;
  mask: string | null;
  subtype: string | null;
}

interface AccountsResponse {
  connected: boolean;
  plaid_connected?: boolean;
  bcp_connected?: boolean;
  institution_name: string | null;
  last_synced_at: string | null;
  accounts: AccountItem[];
}

async function fetchAccounts() {
  const response = await fetch("/api/accounts");
  if (!response.ok) {
    throw new Error("Failed to fetch accounts");
  }
  return response.json() as Promise<AccountsResponse>;
}

async function syncTransactions() {
  const response = await fetch("/api/plaid/sync", { method: "POST" });
  if (!response.ok) {
    throw new Error("Failed to sync transactions");
  }
  return response.json();
}

async function updateAccountBalance(
  accountId: string,
  payload: { balance_anchor_usd: number } | { clear_anchor: true }
) {
  const response = await fetch(`/api/accounts/${accountId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error("Failed to update account balance");
  }

  return response.json();
}

function AccountBalanceRow({
  account,
  currency,
  usdToPen,
  formatAmount,
  onUpdated,
}: {
  account: AccountItem;
  currency: "USD" | "PEN";
  usdToPen: number;
  formatAmount: (amountUsd: number) => string;
  onUpdated: () => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState("");

  const balanceMutation = useMutation({
    mutationFn: (payload: { balance_anchor_usd: number } | { clear_anchor: true }) =>
      updateAccountBalance(account.id, payload),
    onSuccess: () => {
      setIsEditing(false);
      onUpdated();
    },
  });

  const startEditing = () => {
    const displayAmount =
      currency === "PEN"
        ? account.effective_balance_usd * usdToPen
        : account.effective_balance_usd;

    setInputValue(displayAmount.toFixed(2));
    setIsEditing(true);
  };

  const handleSave = () => {
    const parsed = Number.parseFloat(inputValue);

    if (!Number.isFinite(parsed)) {
      return;
    }

    const balanceAnchorUsd =
      currency === "PEN" ? convertPenToUsd(parsed, usdToPen) : parsed;

    balanceMutation.mutate({ balance_anchor_usd: balanceAnchorUsd });
  };

  const handleReset = () => {
    balanceMutation.mutate({ clear_anchor: true });
  };

  return (
    <div className="space-y-1">
      <div className="flex items-start justify-between gap-2">
        {isEditing ? (
          <div className="flex flex-1 items-center gap-2">
            <Input
              type="number"
              step="0.01"
              value={inputValue}
              onChange={(event) => setInputValue(event.target.value)}
              className="h-9 text-lg font-semibold"
              aria-label={`Edit balance for ${account.name}`}
            />
            <Button
              type="button"
              size="icon-sm"
              variant="outline"
              onClick={handleSave}
              disabled={balanceMutation.isPending}
            >
              {balanceMutation.isPending ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Check className="size-3.5" />
              )}
            </Button>
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              onClick={() => setIsEditing(false)}
              disabled={balanceMutation.isPending}
            >
              <X className="size-3.5" />
            </Button>
          </div>
        ) : (
          <>
            <p className="text-2xl font-semibold">
              {formatAmount(account.effective_balance_usd)}
            </p>
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              onClick={startEditing}
              aria-label={`Edit balance for ${account.name}`}
            >
              <Pencil className="size-3.5" />
            </Button>
          </>
        )}
      </div>
      <p className="text-sm text-muted-foreground">
        {account.name}
        {account.mask ? ` ·•••${account.mask}` : ""}
      </p>
      {account.balance_anchor_usd !== null && account.balance_anchor_date ? (
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span>Set manually · {formatDate(account.balance_anchor_date)}</span>
          <button
            type="button"
            className="text-primary hover:underline disabled:opacity-50"
            onClick={handleReset}
            disabled={balanceMutation.isPending}
          >
            Reset to synced
          </button>
        </div>
      ) : null}
      {balanceMutation.isError ? (
        <p className="text-xs text-negative">Failed to update balance.</p>
      ) : null}
    </div>
  );
}

export function BankAccountCard() {
  const queryClient = useQueryClient();
  const { formatAmount, currency, usdToPen } = useCurrency();

  const accountsQuery = useQuery({
    queryKey: ["accounts"],
    queryFn: fetchAccounts,
  });

  const syncMutation = useMutation({
    mutationFn: syncTransactions,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["overview"] });
    },
  });

  const handleSuccess = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["accounts"] });
    queryClient.invalidateQueries({ queryKey: ["transactions"] });
    queryClient.invalidateQueries({ queryKey: ["overview"] });
  }, [queryClient]);

  const data = accountsQuery.data;
  const plaidConnected = data?.plaid_connected ?? Boolean(data?.connected && !data?.bcp_connected);

  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <CardTitle>Bank Account</CardTitle>
        <CardDescription>
          {data?.connected
            ? `${data.institution_name ?? "Connected bank"} · Last synced ${formatRelativeTime(data.last_synced_at)}`
            : "Connect a US bank via Plaid or import a BCP statement to get started"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {accountsQuery.isLoading ? (
          <div className="space-y-3">
            <div className="space-y-1">
              <Skeleton className="h-8 w-36" />
              <Skeleton className="h-4 w-28" />
            </div>
          </div>
        ) : data?.connected && (data.accounts ?? []).length > 0 ? (
          <div className="space-y-3">
            {(data.accounts ?? []).map((account) => (
              <AccountBalanceRow
                key={account.id}
                account={account}
                currency={currency}
                usdToPen={usdToPen}
                formatAmount={formatAmount}
                onUpdated={handleSuccess}
              />
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            No bank connected yet. Click Connect Bank to link an account.
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          {!plaidConnected ? (
            <PlaidLink onSuccess={handleSuccess}>Connect Bank</PlaidLink>
          ) : (
            <Button
              type="button"
              variant="outline"
              onClick={() => syncMutation.mutate()}
              disabled={syncMutation.isPending}
            >
              {syncMutation.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <RefreshCw className="size-4" />
              )}
              Re-sync
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
