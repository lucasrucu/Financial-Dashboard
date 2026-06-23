import Link from "next/link";

import { RequestAccessForm } from "@/components/landing/RequestAccessForm";
import { SIGN_IN_HREF } from "@/components/landing/constants";

export function LandingCta() {
  return (
    <section id="request-access" className="mx-auto w-full max-w-6xl scroll-mt-20 px-4 py-16">
      <div className="relative overflow-hidden rounded-2xl border border-border bg-card px-6 py-14">
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-primary/5" />
        <div className="relative mx-auto max-w-md text-center">
          <h2 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
            Request access
          </h2>
          <p className="mx-auto mt-3 mb-8 max-w-xl text-muted-foreground">
            Qori is invite-only for now. Leave your email and I&apos;ll reach out — or{" "}
            <Link href={SIGN_IN_HREF} className="text-primary underline-offset-4 hover:underline">
              sign in
            </Link>{" "}
            if you already have an account.
          </p>

          <RequestAccessForm />
        </div>
      </div>
    </section>
  );
}
