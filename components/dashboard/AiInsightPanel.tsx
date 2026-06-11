"use client";

import { Loader2, Sparkles, Trash2, TrendingUp, TrendingDown, Minus, Eye } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAiInsight } from "@/hooks/useAiInsight";
import type { AiPortfolioMove } from "@/types/ai";

const ACTION_META: Record<AiPortfolioMove["action"], { label: string; className: string; Icon: React.ElementType }> = {
  buy:   { label: "Buy",   className: "text-green-500",          Icon: TrendingUp },
  hold:  { label: "Hold",  className: "text-muted-foreground",   Icon: Minus },
  sell:  { label: "Sell",  className: "text-red-500",            Icon: TrendingDown },
  watch: { label: "Watch", className: "text-yellow-500",         Icon: Eye },
};

export function AiInsightPanel() {
  const { insight, isLoading, error, analyze, clearInsight } = useAiInsight();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" onClick={() => analyze(true)} disabled={isLoading}>
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
        <Card className="border-negative/40 bg-card">
          <CardContent className="py-6 text-sm text-negative">
            {error instanceof Error ? error.message : "Something went wrong."}
          </CardContent>
        </Card>
      ) : null}

      {insight?.insight ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="border-border bg-card lg:col-span-2">
            <CardHeader>
              <CardTitle>The Roast</CardTitle>
              <CardDescription>{insight.period}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-base leading-relaxed">{insight.insight.roast}</p>
            </CardContent>
          </Card>

          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="text-positive">Wins</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                {insight.insight.wins.map((item) => (
                  <li key={item} className="rounded-lg bg-background/60 px-3 py-2">
                    {item}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle>Action Items</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                {insight.insight.actions.map((item) => (
                  <li key={item} className="rounded-lg bg-background/60 px-3 py-2">
                    {item}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="text-negative">Flagged</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                {insight.insight.flagged.length ? (
                  insight.insight.flagged.map((item) => (
                    <li key={item} className="rounded-lg bg-background/60 px-3 py-2">
                      {item}
                    </li>
                  ))
                ) : (
                  <li className="text-muted-foreground">Nothing flagged this period.</li>
                )}
              </ul>
            </CardContent>
          </Card>

          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle>Goal Allocations</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                {Object.entries(insight.insight.allocations).map(([goal, advice]) => (
                  <li key={goal} className="rounded-lg bg-background/60 px-3 py-2">
                    <p className="font-medium">{goal}</p>
                    <p className="text-muted-foreground">{advice}</p>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {insight.insight.portfolio ? (
            <Card className="border-border bg-card lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="size-4" />
                  Portfolio Moves
                </CardTitle>
                <CardDescription>{insight.insight.portfolio.summary}</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {insight.insight.portfolio.moves.map((move) => {
                    const meta = ACTION_META[move.action] ?? ACTION_META.hold;
                    const { Icon } = meta;
                    return (
                      <li
                        key={move.ticker}
                        className="flex items-start gap-3 rounded-lg bg-background/60 px-3 py-2.5"
                      >
                        <div className={`mt-0.5 shrink-0 ${meta.className}`}>
                          <Icon className="size-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="flex items-baseline gap-1.5 text-sm">
                            <span className="font-mono font-semibold">{move.ticker}</span>
                            <span className={`text-xs font-medium ${meta.className}`}>{meta.label}</span>
                          </p>
                          <p className="mt-0.5 text-xs text-muted-foreground leading-snug">
                            {move.rationale}
                          </p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </CardContent>
            </Card>
          ) : null}
        </div>
      ) : !isLoading && !error ? (
        <Card className="border-border bg-card">
          <CardContent className="py-10 text-center text-muted-foreground">
            Press Roast my finances to generate insights.
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
