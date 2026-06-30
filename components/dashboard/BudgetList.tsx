"use client";

import { memo, useMemo, useState } from "react";
import { Loader2, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCurrency } from "@/hooks/useCurrency";
import { useCategories } from "@/hooks/useCategories";
import {
  useBudgetProgress,
  useCreateBudget,
  useDeleteBudget,
  useUpdateBudget,
} from "@/hooks/useBudgets";
import {
  EXCLUDED_FROM_TOTALS_CATEGORY_IDS,
  INCOME_CATEGORIES,
} from "@/constants/categories";
import type { Category } from "@/types/category";
import type { BudgetProgress } from "@/types/budget";

const INCOME_CATEGORY_IDS = new Set<string>(INCOME_CATEGORIES.map((c) => c.id));

// Budgets only make sense for spending categories — exclude income + transfer ids.
function spendableCategories(categories: Category[] | undefined) {
  return (categories ?? []).filter(
    (category) =>
      !INCOME_CATEGORY_IDS.has(category.id) &&
      !EXCLUDED_FROM_TOTALS_CATEGORY_IDS.has(category.id)
  );
}

function BudgetBar({ item }: { item: BudgetProgress }) {
  const { formatAmount } = useCurrency();
  const width = `${Math.min(item.percentUsed, 100)}%`;
  const barColor = item.overBudget ? "var(--negative-bar, #ef4444)" : item.color;

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">{item.label}</span>
        <span className={item.overBudget ? "text-negative" : "text-muted-foreground"}>
          {formatAmount(item.spent)} of {formatAmount(item.amount)}
        </span>
      </div>
      <div className="h-2 rounded-full bg-muted">
        <div
          className="h-2 rounded-full transition-all"
          style={{ width, backgroundColor: barColor }}
        />
      </div>
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{item.percentUsed.toFixed(0)}% used</span>
        <span className={item.overBudget ? "text-negative" : "text-positive"}>
          {item.overBudget
            ? `${formatAmount(Math.abs(item.remaining))} over`
            : `${formatAmount(item.remaining)} left`}
        </span>
      </div>
    </div>
  );
}

function BudgetEditor({
  item,
  onSave,
  onCancel,
  saving,
}: {
  item: BudgetProgress;
  onSave: (amount: number) => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const [amount, setAmount] = useState(String(item.amount));

  return (
    <div className="flex flex-1 flex-wrap items-end gap-2">
      <div className="space-y-1">
        <Label htmlFor={`budget-amount-${item.budgetId}`} className="text-xs">
          Limit for {item.label} (USD)
        </Label>
        <Input
          id={`budget-amount-${item.budgetId}`}
          type="number"
          min="0"
          step="0.01"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          className="h-8 w-32"
        />
      </div>
      <Button
        type="button"
        size="sm"
        disabled={saving || !amount || Number(amount) <= 0}
        onClick={() => onSave(Number(amount))}
      >
        {saving ? <Loader2 className="size-4 animate-spin" /> : "Save"}
      </Button>
      <Button type="button" size="sm" variant="ghost" onClick={onCancel}>
        Cancel
      </Button>
    </div>
  );
}

const BudgetRow = memo(function BudgetRow({ item }: { item: BudgetProgress }) {
  const updateBudget = useUpdateBudget();
  const deleteBudget = useDeleteBudget();
  const [editing, setEditing] = useState(false);

  return (
    <div className="rounded-lg border border-border bg-background/60 px-4 py-3">
      {editing ? (
        <BudgetEditor
          item={item}
          saving={updateBudget.isPending}
          onSave={(amount) =>
            updateBudget.mutate(
              { id: item.budgetId, amount },
              { onSuccess: () => setEditing(false) }
            )
          }
          onCancel={() => setEditing(false)}
        />
      ) : (
        <div className="flex flex-wrap items-center gap-3">
          <div className="min-w-0 flex-1">
            <BudgetBar item={item} />
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setEditing(true)}
            >
              Edit
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={deleteBudget.isPending}
              onClick={() => deleteBudget.mutate(item.budgetId)}
            >
              {deleteBudget.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Trash2 className="size-4" />
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
});

export function BudgetList() {
  const { data, isLoading, error } = useBudgetProgress(0);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return <p className="text-sm text-negative">Failed to load budgets.</p>;
  }

  if (!data?.progress.length) {
    return (
      <p className="text-sm text-muted-foreground">
        No budgets yet. Set your first category limit below.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {data.summary.overLimitCount > 0 ? (
        <p className="text-sm text-negative">
          {data.summary.overLimitCount} of {data.summary.totalBudgets} budgets over limit
          this month.
        </p>
      ) : (
        <p className="text-sm text-positive">
          All {data.summary.totalBudgets} budgets within limit this month.
        </p>
      )}
      {data.progress.map((item) => (
        <BudgetRow key={item.budgetId} item={item} />
      ))}
    </div>
  );
}

export function BudgetForm() {
  const createBudget = useCreateBudget();
  const { data: categories } = useCategories();
  const { data: progress } = useBudgetProgress(0);
  const [categoryId, setCategoryId] = useState("");
  const [amount, setAmount] = useState("");

  // Hide categories that already have a budget (one per category, enforced in DB).
  const budgetedIds = useMemo(
    () => new Set((progress?.progress ?? []).map((item) => item.categoryId)),
    [progress]
  );
  const available = useMemo(
    () => spendableCategories(categories).filter((c) => !budgetedIds.has(c.id)),
    [categories, budgetedIds]
  );

  return (
    <form
      className="flex flex-wrap items-end gap-3 rounded-lg border border-border bg-card p-4"
      onSubmit={(event) => {
        event.preventDefault();
        if (!categoryId || !amount || Number(amount) <= 0) {
          return;
        }

        createBudget.mutate(
          { category: categoryId, amount: Number(amount), period: "monthly" },
          {
            onSuccess: () => {
              setCategoryId("");
              setAmount("");
            },
          }
        );
      }}
    >
      <div className="space-y-1">
        <Label htmlFor="new-budget-category">Category</Label>
        <Select
          value={categoryId || null}
          onValueChange={(value) => setCategoryId(value ?? "")}
        >
          <SelectTrigger id="new-budget-category" className="h-10 w-52">
            <SelectValue placeholder="Choose category" />
          </SelectTrigger>
          <SelectContent>
            {available.map((category) => (
              <SelectItem key={category.id} value={category.id}>
                {category.icon} {category.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <Label htmlFor="new-budget-amount">Monthly limit (USD)</Label>
        <Input
          id="new-budget-amount"
          type="number"
          min="0"
          step="0.01"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          placeholder="500"
          className="w-32"
        />
      </div>
      <Button
        type="submit"
        disabled={
          createBudget.isPending || !categoryId || !amount || Number(amount) <= 0
        }
      >
        {createBudget.isPending ? <Loader2 className="size-4 animate-spin" /> : "Add"}
      </Button>
      {available.length === 0 ? (
        <p className="w-full text-sm text-muted-foreground">
          Every spending category already has a budget. Edit an existing one below.
        </p>
      ) : null}
      {createBudget.error ? (
        <p className="w-full text-sm text-negative">{createBudget.error.message}</p>
      ) : null}
    </form>
  );
}
