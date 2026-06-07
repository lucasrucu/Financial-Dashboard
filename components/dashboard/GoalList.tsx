"use client";

import { memo, useState } from "react";
import { Loader2, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { useCurrency } from "@/hooks/useCurrency";
import {
  useCreateGoal,
  useDeleteGoal,
  useGoals,
  useUpdateGoal,
} from "@/hooks/useGoals";
import type { Goal } from "@/types/goal";
import { formatDate } from "@/lib/utils";

function GoalEditor({
  goal,
  onSave,
  onCancel,
}: {
  goal: Goal;
  onSave: (updates: Partial<Goal>) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(goal.name);
  const [target, setTarget] = useState(String(goal.target_usd));
  const [saved, setSaved] = useState(String(goal.saved_usd));
  const [deadline, setDeadline] = useState(goal.deadline ?? "");

  return (
    <div className="flex flex-1 flex-wrap items-end gap-2">
      <div className="space-y-1">
        <Label htmlFor={`goal-name-${goal.id}`} className="text-xs">
          Name
        </Label>
        <Input
          id={`goal-name-${goal.id}`}
          value={name}
          onChange={(event) => setName(event.target.value)}
          className="h-8 w-40"
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor={`goal-target-${goal.id}`} className="text-xs">
          Target (USD)
        </Label>
        <Input
          id={`goal-target-${goal.id}`}
          type="number"
          value={target}
          onChange={(event) => setTarget(event.target.value)}
          className="h-8 w-28"
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor={`goal-saved-${goal.id}`} className="text-xs">
          Saved (USD)
        </Label>
        <Input
          id={`goal-saved-${goal.id}`}
          type="number"
          value={saved}
          onChange={(event) => setSaved(event.target.value)}
          className="h-8 w-28"
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor={`goal-deadline-${goal.id}`} className="text-xs">
          Deadline
        </Label>
        <Input
          id={`goal-deadline-${goal.id}`}
          type="date"
          value={deadline}
          onChange={(event) => setDeadline(event.target.value)}
          className="h-8 w-36"
        />
      </div>
      <Button
        type="button"
        size="sm"
        onClick={() =>
          onSave({
            name,
            target_usd: Number(target),
            saved_usd: Number(saved),
            deadline: deadline || null,
          })
        }
      >
        Save
      </Button>
      <Button type="button" size="sm" variant="ghost" onClick={onCancel}>
        Cancel
      </Button>
    </div>
  );
}

const GoalRow = memo(function GoalRow({ goal }: { goal: Goal }) {
  const { formatAmount } = useCurrency();
  const updateGoal = useUpdateGoal();
  const deleteGoal = useDeleteGoal();
  const [editing, setEditing] = useState(false);

  const progress =
    goal.target_usd === 0 ? 0 : Math.min((goal.saved_usd / goal.target_usd) * 100, 100);

  return (
    <div className="rounded-lg border border-border bg-background/60 px-4 py-3">
      {editing ? (
        <GoalEditor
          goal={goal}
          onSave={(updates) => {
            updateGoal.mutate(
              { id: goal.id, ...updates },
              { onSuccess: () => setEditing(false) }
            );
          }}
          onCancel={() => setEditing(false)}
        />
      ) : (
        <div className="flex flex-wrap items-center gap-3">
          <div className="min-w-0 flex-1 space-y-2">
            <div>
              <p className="font-medium">{goal.name}</p>
              <p className="text-xs text-muted-foreground">
                {goal.deadline
                  ? `Target by ${formatDate(goal.deadline)}`
                  : "No deadline set"}
              </p>
            </div>
            <div className="flex items-end justify-between gap-4">
              <p className="text-lg font-semibold">{formatAmount(goal.saved_usd)}</p>
              <p className="text-sm text-muted-foreground">
                of {formatAmount(goal.target_usd)}
              </p>
            </div>
            <Progress value={progress} className="h-2" />
            <p className="text-xs text-muted-foreground">{progress.toFixed(0)}% complete</p>
          </div>
          <div className="flex gap-2">
            <Button type="button" size="sm" variant="outline" onClick={() => setEditing(true)}>
              Edit
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={deleteGoal.isPending}
              onClick={() => deleteGoal.mutate(goal.id)}
            >
              {deleteGoal.isPending ? (
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

export function GoalList() {
  const { data: goals, isLoading, error } = useGoals();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return <p className="text-sm text-negative">Failed to load goals.</p>;
  }

  if (!goals?.length) {
    return (
      <p className="text-sm text-muted-foreground">
        No goals yet. Create your first savings goal below.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {goals.map((goal) => (
        <GoalRow key={goal.id} goal={goal} />
      ))}
    </div>
  );
}

export function GoalForm() {
  const createGoal = useCreateGoal();
  const [name, setName] = useState("");
  const [target, setTarget] = useState("");
  const [saved, setSaved] = useState("0");
  const [deadline, setDeadline] = useState("");

  return (
    <form
      className="flex flex-wrap items-end gap-3 rounded-lg border border-border bg-card p-4"
      onSubmit={(event) => {
        event.preventDefault();
        if (!name.trim() || !target || Number(target) <= 0) {
          return;
        }

        createGoal.mutate(
          {
            name: name.trim(),
            target_usd: Number(target),
            saved_usd: Number(saved) || 0,
            deadline: deadline || null,
          },
          {
            onSuccess: () => {
              setName("");
              setTarget("");
              setSaved("0");
              setDeadline("");
            },
          }
        );
      }}
    >
      <div className="space-y-1">
        <Label htmlFor="new-goal-name">New goal</Label>
        <Input
          id="new-goal-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="e.g. Emergency fund"
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="new-goal-target">Target (USD)</Label>
        <Input
          id="new-goal-target"
          type="number"
          min="0"
          step="0.01"
          value={target}
          onChange={(event) => setTarget(event.target.value)}
          placeholder="5000"
          className="w-28"
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="new-goal-saved">Saved (USD)</Label>
        <Input
          id="new-goal-saved"
          type="number"
          min="0"
          step="0.01"
          value={saved}
          onChange={(event) => setSaved(event.target.value)}
          className="w-28"
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="new-goal-deadline">Deadline</Label>
        <Input
          id="new-goal-deadline"
          type="date"
          value={deadline}
          onChange={(event) => setDeadline(event.target.value)}
          className="w-36"
        />
      </div>
      <Button
        type="submit"
        disabled={createGoal.isPending || !name.trim() || !target || Number(target) <= 0}
      >
        {createGoal.isPending ? <Loader2 className="size-4 animate-spin" /> : "Add"}
      </Button>
      {createGoal.error ? (
        <p className="w-full text-sm text-negative">{createGoal.error.message}</p>
      ) : null}
    </form>
  );
}
