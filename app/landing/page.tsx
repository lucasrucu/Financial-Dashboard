import type { Metadata } from "next";

import { LandingNav } from "@/components/landing/LandingNav";
import { LandingHero } from "@/components/landing/LandingHero";
import { FeatureHighlights } from "@/components/landing/FeatureHighlights";
import { LiveDemo } from "@/components/landing/LiveDemo";
import { LandingCta } from "@/components/landing/LandingCta";
import { LandingFooter } from "@/components/landing/LandingFooter";

export const metadata: Metadata = {
  title: "Qori — Personal finance, unified",
  description:
    "Qori unifies your US banks, Peruvian bank statements, and brokerage holdings, with AI-powered insights. Multi-currency USD/PEN.",
};

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <LandingNav />
      <main>
        <LandingHero />
        <FeatureHighlights />
        <LiveDemo />
        <LandingCta />
      </main>
      <LandingFooter />
    </div>
  );
}
