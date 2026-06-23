import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { REQUEST_ACCESS_HREF, SIGN_IN_HREF } from "@/components/landing/constants";

export function LandingCta() {
  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-16">
      <div className="relative overflow-hidden rounded-2xl border border-border bg-card px-6 py-14 text-center">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-primary/5"
        />
        <div className="relative">
          <h2 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
            Want in?
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
            Qori is invite-only for now. Request access and I&apos;ll get you set up — or sign in if
            you already have an account.
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
        </div>
      </div>
    </section>
  );
}
