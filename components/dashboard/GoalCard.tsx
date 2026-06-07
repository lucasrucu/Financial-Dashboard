"use client";

import { memo } from "react";
import Link from "next/link";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useCurrency } from "@/hooks/useCurrency";
import { useGoals } from "@/hooks/useGoals";
import type { Goal } from "@/types/goal";
import { formatDate } from "@/lib/utils";

export const GoalCard = memo(function GoalCard({ goal }: { goal: Goal }) {
  const { formatAmount } = useCurrency();

  const progress =
    goal.target_usd === 0 ? 0 : Math.min((goal.saved_usd / goal.target_usd) * 100, 100);

  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <CardTitle className="text-base">{goal.name}</CardTitle>
        <CardDescription>
          {goal.deadline ? `Target by ${formatDate(goal.deadline)}` : "No deadline set"}
        </CardDescription>
      </CardHeader>
      <CardContent>
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
      </CardContent>
    </Card>
  );
});

export function GoalCards() {
  const { data: goals, isLoading, error } = useGoals();

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} className="border-border bg-card">
            <CardHeader className="flex flex-row items-start justify-between gap-2">
              <div className="space-y-1.5">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-24" />
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-end justify-between">
                <Skeleton className="h-7 w-24" />
                <Skeleton className="h-4 w-16" />
              </div>
              <Skeleton className="h-2 w-full" />
              <Skeleton className="h-3 w-20" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return <p className="text-sm text-negative">Failed to load goals.</p>;
  }

  if (!goals?.length) {
    return (
      <p className="text-sm text-muted-foreground">
        No goals yet.{" "}
        <Link href="/goals" className="text-primary hover:underline">
          Create one on the Goals page
        </Link>
        .
      </p>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {goals.map((goal) => (
        <GoalCard key={goal.id} goal={goal} />
      ))}
    </div>
  );
}
