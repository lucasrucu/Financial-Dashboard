"use client";

import { useState } from "react";
import { Pencil, Check, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { useCurrency } from "@/hooks/useCurrency";
import { useGoals } from "@/hooks/useGoals";
import type { Goal } from "@/types/goal";
import { formatDate } from "@/lib/utils";

function GoalEditor({
  goal,
  onSave,
  onCancel,
}: {
  goal: Goal;
  onSave: (updates: Partial<Goal>) => Promise<void>;
  onCancel: () => void;
}) {
  const [name, setName] = useState(goal.name);
  const [target, setTarget] = useState(String(goal.target_usd));
  const [saved, setSaved] = useState(String(goal.saved_usd));
  const [deadline, setDeadline] = useState(goal.deadline ?? "");
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave({
        name,
        target_usd: Number(target),
        saved_usd: Number(saved),
        deadline: deadline || null,
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <Label htmlFor={`goal-name-${goal.id}`}>Name</Label>
        <Input
          id={`goal-name-${goal.id}`}
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label htmlFor={`goal-target-${goal.id}`}>Target (USD)</Label>
          <Input
            id={`goal-target-${goal.id}`}
            type="number"
            value={target}
            onChange={(event) => setTarget(event.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor={`goal-saved-${goal.id}`}>Saved (USD)</Label>
          <Input
            id={`goal-saved-${goal.id}`}
            type="number"
            value={saved}
            onChange={(event) => setSaved(event.target.value)}
          />
        </div>
      </div>
      <div className="space-y-1">
        <Label htmlFor={`goal-deadline-${goal.id}`}>Deadline</Label>
        <Input
          id={`goal-deadline-${goal.id}`}
          type="date"
          value={deadline}
          onChange={(event) => setDeadline(event.target.value)}
        />
      </div>
      <div className="flex gap-2">
        <Button type="button" size="sm" onClick={handleSave} disabled={isSaving}>
          <Check className="size-4" />
          Save
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onCancel}>
          <X className="size-4" />
          Cancel
        </Button>
      </div>
    </div>
  );
}

export function GoalCard({ goal }: { goal: Goal }) {
  const { formatAmount } = useCurrency();
  const { updateGoal } = useGoals();
  const [isEditing, setIsEditing] = useState(false);

  const progress =
    goal.target_usd === 0 ? 0 : Math.min((goal.saved_usd / goal.target_usd) * 100, 100);

  return (
    <Card className="border-slate-800 bg-slate-900/50">
      <CardHeader className="flex flex-row items-start justify-between gap-2">
        <div>
          <CardTitle className="text-base">{goal.name}</CardTitle>
          <CardDescription>
            {goal.deadline ? `Target by ${formatDate(goal.deadline)}` : "No deadline set"}
          </CardDescription>
        </div>
        {!isEditing ? (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => setIsEditing(true)}
            aria-label={`Edit ${goal.name}`}
          >
            <Pencil className="size-4" />
          </Button>
        ) : null}
      </CardHeader>
      <CardContent>
        {isEditing ? (
          <GoalEditor
            goal={goal}
            onSave={async (updates) => {
              await updateGoal({ id: goal.id, ...updates });
              setIsEditing(false);
            }}
            onCancel={() => setIsEditing(false)}
          />
        ) : (
          <div className="space-y-3">
            <div className="flex items-end justify-between">
              <p className="text-xl font-semibold">{formatAmount(goal.saved_usd)}</p>
              <p className="text-sm text-muted-foreground">
                of {formatAmount(goal.target_usd)}
              </p>
            </div>
            <Progress value={progress} className="h-2" />
            <p className="text-xs text-muted-foreground">{progress.toFixed(0)}% complete</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function GoalCards() {
  const { goals, isLoading, error } = useGoals();

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading goals...</p>;
  }

  if (error) {
    return <p className="text-sm text-negative">Failed to load goals.</p>;
  }

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {goals.map((goal) => (
        <GoalCard key={goal.id} goal={goal} />
      ))}
    </div>
  );
}
