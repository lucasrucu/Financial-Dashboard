"use client";

import { Loader2, RefreshCw, Sparkles, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAiInsight } from "@/hooks/useAiInsight";

export function AiInsightPanel() {
  const { insight, isLoading, error, analyze, clearInsight } = useAiInsight();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" onClick={() => analyze(false)} disabled={isLoading}>
          {isLoading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <RefreshCw className="size-4" />
          )}
          Refresh insights
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => analyze(true)}
          disabled={isLoading}
        >
          {isLoading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Sparkles className="size-4" />
          )}
          Roast my finances
        </Button>
        {insight ? (
          <Button type="button" variant="ghost" onClick={clearInsight} disabled={isLoading}>
            <Trash2 className="size-4" />
            Clear
          </Button>
        ) : null}
        {insight?.cached ? (
          <p className="text-xs text-muted-foreground">
            Showing cached analysis from {new Date(insight.created_at).toLocaleString()}
          </p>
        ) : null}
      </div>

      {error ? (
        <Card className="border-negative/40 bg-slate-900/50">
          <CardContent className="py-6 text-sm text-negative">
            {error instanceof Error ? error.message : "Something went wrong."}
          </CardContent>
        </Card>
      ) : null}

      {insight?.insight ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="border-slate-800 bg-slate-900/50 lg:col-span-2">
            <CardHeader>
              <CardTitle>The Roast</CardTitle>
              <CardDescription>{insight.period}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-base leading-relaxed">{insight.insight.roast}</p>
            </CardContent>
          </Card>

          <Card className="border-slate-800 bg-slate-900/50">
            <CardHeader>
              <CardTitle className="text-positive">Wins</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                {insight.insight.wins.map((item) => (
                  <li key={item} className="rounded-lg bg-slate-950/60 px-3 py-2">
                    {item}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card className="border-slate-800 bg-slate-900/50">
            <CardHeader>
              <CardTitle>Action Items</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                {insight.insight.actions.map((item) => (
                  <li key={item} className="rounded-lg bg-slate-950/60 px-3 py-2">
                    {item}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card className="border-slate-800 bg-slate-900/50">
            <CardHeader>
              <CardTitle className="text-negative">Flagged</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                {insight.insight.flagged.length ? (
                  insight.insight.flagged.map((item) => (
                    <li key={item} className="rounded-lg bg-slate-950/60 px-3 py-2">
                      {item}
                    </li>
                  ))
                ) : (
                  <li className="text-muted-foreground">Nothing flagged this period.</li>
                )}
              </ul>
            </CardContent>
          </Card>

          <Card className="border-slate-800 bg-slate-900/50">
            <CardHeader>
              <CardTitle>Goal Allocations</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                {Object.entries(insight.insight.allocations).map(([goal, advice]) => (
                  <li key={goal} className="rounded-lg bg-slate-950/60 px-3 py-2">
                    <p className="font-medium">{goal}</p>
                    <p className="text-muted-foreground">{advice}</p>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      ) : !isLoading && !error ? (
        <Card className="border-slate-800 bg-slate-900/50">
          <CardContent className="py-10 text-center text-muted-foreground">
            Refresh for cached insights or hit Roast for a fresh (loving) analysis.
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
