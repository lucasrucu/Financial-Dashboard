import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { REQUEST_ACCESS_HREF, SIGN_IN_HREF } from "@/components/landing/constants";

export function LandingHero() {
  return (
    <section className="relative overflow-hidden">
      {/* soft brand glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -top-40 h-80 bg-primary/10 blur-3xl"
      />
      <div className="mx-auto w-full max-w-4xl px-4 py-20 text-center sm:py-28">
        <Badge variant="outline" className="mb-6">
          Personal finance, unified
        </Badge>
        <h1 className="text-balance text-4xl font-semibold tracking-tight sm:text-6xl">
          Every account, every currency,{" "}
          <span className="text-primary">one clear picture.</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-balance text-lg text-muted-foreground">
          Financial Dashboard pulls together your US banks, Peruvian bank statements, and brokerage holdings —
          then puts an AI analyst on top to tell you what it actually means.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link href={REQUEST_ACCESS_HREF} className={cn(buttonVariants({ size: "lg" }), "h-11 px-6 text-base")}>
            Request Access
            <ArrowRight className="size-4" />
          </Link>
          <Link
            href={SIGN_IN_HREF}
            className={cn(buttonVariants({ variant: "outline", size: "lg" }), "h-11 px-6 text-base")}
          >
            Sign In
          </Link>
        </div>

        <p className="mt-4 text-sm text-muted-foreground">
          Invite-only · or{" "}
          <Link href="#demo" className="text-primary underline-offset-4 hover:underline">
            explore the live demo
          </Link>{" "}
          below.
        </p>
      </div>
    </section>
  );
}
