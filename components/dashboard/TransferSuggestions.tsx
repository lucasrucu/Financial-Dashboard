"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, Loader2, Repeat, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCurrency } from "@/hooks/useCurrency";
import { batchUpdateTransactionCategories } from "@/hooks/useTransactions";
import { useTransferSuggestions } from "@/hooks/useTransferSuggestions";
import { TRANSFER_CATEGORY_ID } from "@/constants/categories";
import { formatDateShort } from "@/lib/utils";
import type { TransferCandidatePair } from "@/lib/transfers";

function pairKey(pair: TransferCandidatePair) {
  return `${pair.outflow.id}_${pair.inflow.id}`;
}

export function TransferSuggestions() {
  const { data, isLoading } = useTransferSuggestions();
  const { formatAmount } = useCurrency();
  const queryClient = useQueryClient();
  const [dismissed, setDismissed] = useState<Set<string>>(() => new Set());
  const [hidden, setHidden] = useState(false);
  const [pendingKey, setPendingKey] = useState<string | null>(null);

  const markMutation = useMutation({
    mutationFn: ({ pair }: { pair: TransferCandidatePair; key: string }) =>
      batchUpdateTransactionCategories(
        [pair.outflow.id, pair.inflow.id],
        TRANSFER_CATEGORY_ID
      ),
    onMutate: ({ key }) => setPendingKey(key),
    onError: () => toast.error("Failed to mark as transfer"),
    onSuccess: (_data, { pair }) => {
      toast.success("Marked as transfer");
      setDismissed((current) => new Set(current).add(pairKey(pair)));
    },
    onSettled: () => {
      setPendingKey(null);
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["overview"] });
      queryClient.invalidateQueries({ queryKey: ["transfer-suggestions"] });
    },
  });

  if (isLoading || hidden) {
    return null;
  }

  const pairs = (data?.pairs ?? []).filter((pair) => !dismissed.has(pairKey(pair)));

  if (!pairs.length) {
    return null;
  }

  return (
    <Card className="border-border bg-card">
      <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Repeat className="size-4 text-primary" />
          {pairs.length} possible {pairs.length === 1 ? "transfer" : "transfers"}
        </CardTitle>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Hide suggestions"
          onClick={() => setHidden(true)}
        >
          <X className="size-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-2">
        <p className="text-xs text-muted-foreground">
          Money that looks like it moved between your own accounts. Marking a pair as a transfer
          excludes both from spending &amp; income totals.
        </p>

        {pairs.map((pair) => {
          const key = pairKey(pair);
          const isPending = pendingKey === key && markMutation.isPending;

          return (
            <div
              key={key}
              className="flex flex-col gap-3 rounded-lg border border-border bg-background/40 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex min-w-0 flex-1 items-center gap-2 text-sm">
                <div className="min-w-0">
                  <p className="truncate font-medium">{pair.outflow.account_name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {formatAmount(Math.abs(pair.outflow.amount_usd))} ·{" "}
                    {formatDateShort(pair.outflow.date)}
                  </p>
                </div>
                <ArrowRight className="size-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0">
                  <p className="truncate font-medium">{pair.inflow.account_name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {formatAmount(Math.abs(pair.inflow.amount_usd))} ·{" "}
                    {formatDateShort(pair.inflow.date)}
                  </p>
                </div>
                {pair.deltaUsd > 0 ? (
                  <span className="hidden shrink-0 text-xs text-muted-foreground md:inline">
                    ({formatAmount(pair.deltaUsd)} fee)
                  </span>
                ) : null}
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  disabled={isPending}
                  onClick={() => markMutation.mutate({ pair, key })}
                >
                  {isPending ? <Loader2 className="size-4 animate-spin" /> : "Mark as transfer"}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={isPending}
                  onClick={() =>
                    setDismissed((current) => new Set(current).add(key))
                  }
                >
                  Dismiss
                </Button>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
