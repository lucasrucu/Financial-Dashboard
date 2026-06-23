import { Landmark, Sparkles, TrendingUp, Globe, type LucideIcon } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const FEATURES: { icon: LucideIcon; title: string; description: string }[] = [
  {
    icon: Landmark,
    title: "Multi-source ingestion",
    description:
      "Live US bank connections via Plaid, Peruvian BCP statements parsed straight from PDF, and Fidelity holdings from CSV — all normalized into one ledger.",
  },
  {
    icon: Sparkles,
    title: "AI insights",
    description:
      "Claude reads your month and hands back a candid roast, concrete action items, flagged charges, and goal-by-goal allocation advice.",
  },
  {
    icon: TrendingUp,
    title: "Investments tracking",
    description:
      "Positions, cost basis, and gains in one table — with AI suggestions on what to hold, watch, or rotate out of.",
  },
  {
    icon: Globe,
    title: "USD / PEN multi-currency",
    description:
      "Everything is stored in USD and converted to Soles at render time with a daily exchange rate. Toggle currencies anywhere.",
  },
];

export function FeatureHighlights() {
  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-16">
      <div className="mx-auto mb-10 max-w-2xl text-center">
        <h2 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
          Built like a product, not a spreadsheet
        </h2>
        <p className="mt-3 text-muted-foreground">
          Data ingestion, authentication, AI, and deployment — wired together into something you&apos;d
          actually use every day.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {FEATURES.map(({ icon: Icon, title, description }) => (
          <Card key={title} className="border-border bg-card">
            <CardHeader>
              <div className="mb-2 flex size-10 items-center justify-center rounded-lg bg-primary/15 text-primary">
                <Icon className="size-5" />
              </div>
              <CardTitle className="text-lg">{title}</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="leading-relaxed">{description}</CardDescription>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
