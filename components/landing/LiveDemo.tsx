"use client";

import { useState } from "react";
import { LayoutDashboard, Receipt, Sparkles, TrendingUp, type LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { DemoOverview } from "@/components/landing/demo/DemoOverview";
import { DemoTransactions } from "@/components/landing/demo/DemoTransactions";
import { DemoInvestments } from "@/components/landing/demo/DemoInvestments";
import { DemoAiInsights } from "@/components/landing/demo/DemoAiInsights";

type TabId = "overview" | "transactions" | "investments" | "ai";

const TABS: { id: TabId; label: string; icon: LucideIcon }[] = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "transactions", label: "Transactions", icon: Receipt },
  { id: "investments", label: "Investments", icon: TrendingUp },
  { id: "ai", label: "AI Insights", icon: Sparkles },
];

export function LiveDemo() {
  const [active, setActive] = useState<TabId>("overview");

  return (
    <section id="demo" className="mx-auto w-full max-w-6xl px-4 py-16 sm:py-24">
      <div className="mx-auto mb-8 max-w-2xl text-center">
        <Badge variant="outline" className="mb-4">
          Live demo · sample data
        </Badge>
        <h2 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
          Click around the actual product
        </h2>
        <p className="mt-3 text-muted-foreground">
          This is the real interface running on hardcoded sample data — no login required. Switch
          tabs to explore spending, transactions, investments, and AI insights.
        </p>
      </div>

      {/* Mock app frame */}
      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-2xl">
        <div className="flex items-center gap-2 border-b border-border bg-background/40 px-4 py-3">
          <span className="size-3 rounded-full bg-red-500/70" />
          <span className="size-3 rounded-full bg-yellow-500/70" />
          <span className="size-3 rounded-full bg-green-500/70" />
          <span className="ml-3 truncate text-xs text-muted-foreground">qori.land</span>
        </div>

        {/* Tab bar */}
        <div className="flex gap-1 overflow-x-auto border-b border-border bg-background/40 px-2 py-2">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setActive(id)}
              className={cn(
                "flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                active === id
                  ? "bg-primary/15 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Icon className="size-4" />
              {label}
            </button>
          ))}
        </div>

        {/* Panel */}
        <div className="p-4 sm:p-6">
          {active === "overview" && <DemoOverview />}
          {active === "transactions" && <DemoTransactions />}
          {active === "investments" && <DemoInvestments />}
          {active === "ai" && <DemoAiInsights />}
        </div>
      </div>

      <p className="mt-4 text-center text-xs text-muted-foreground">
        Sample data — not connected to any real accounts.
      </p>
    </section>
  );
}
