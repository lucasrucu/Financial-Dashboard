import type { Metadata } from "next";
import Link from "next/link";

import { LandingNav } from "@/components/landing/LandingNav";
import { LandingFooter } from "@/components/landing/LandingFooter";

export const metadata: Metadata = {
  title: "Privacy Policy — Financial Dashboard",
  description: "What Financial Dashboard collects, how it's stored, who can access it, and how to request deletion.",
};

const LAST_UPDATED = "June 23, 2026";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
      <div className="space-y-3 text-sm leading-relaxed text-muted-foreground">{children}</div>
    </section>
  );
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <LandingNav />
      <main className="mx-auto w-full max-w-3xl px-4 py-16">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Privacy Policy</h1>
        <p className="mt-2 text-sm text-muted-foreground">Last updated {LAST_UPDATED}</p>

        <div className="mt-10 space-y-10">
          <p className="text-sm leading-relaxed text-muted-foreground">
            Financial Dashboard is a personal finance dashboard operated by an individual (&quot;the
            operator&quot;). It is invite-only and handles sensitive financial data. This page
            explains, in plain language, what is collected, how it is stored, who can access it,
            and how to have it deleted. By requesting access and using Financial Dashboard, you consent to the
            practices described here.
          </p>

          <Section title="What we collect">
            <ul className="list-disc space-y-1.5 pl-5">
              <li>
                <strong className="text-foreground">Account info</strong> — your name and email
                from Google sign-in (via Supabase Auth).
              </li>
              <li>
                <strong className="text-foreground">Bank transactions</strong> — when you connect a
                US bank through Plaid, or upload a BCP statement, we store the resulting
                transactions (date, description, amount, category). Raw PDF statements are{" "}
                <em>not</em> retained — only the parsed transactions.
              </li>
              <li>
                <strong className="text-foreground">Bank access tokens</strong> — Plaid issues a
                token that lets Financial Dashboard read your connected accounts on your behalf; it is stored to
                keep balances in sync.
              </li>
              <li>
                <strong className="text-foreground">Investments</strong> — holdings you import from
                a Fidelity CSV (ticker, quantity, value, gains).
              </li>
              <li>
                <strong className="text-foreground">Access requests</strong> — the email (and
                optional note) you submit on the landing page, plus your IP address for abuse
                prevention.
              </li>
            </ul>
          </Section>

          <Section title="How it's used">
            <p>
              Your data is used solely to power your own dashboard: aggregating accounts, computing
              net worth and spending, and generating AI insights you explicitly request. It is{" "}
              <strong className="text-foreground">never sold</strong>, and it is not used for
              advertising.
            </p>
          </Section>

          <Section title="Third parties">
            <p>Financial Dashboard shares data with these processors only as needed to function:</p>
            <ul className="list-disc space-y-1.5 pl-5">
              <li><strong className="text-foreground">Supabase</strong> — database, authentication, and hosting of your data.</li>
              <li><strong className="text-foreground">Plaid</strong> — secure connection to US bank accounts.</li>
              <li><strong className="text-foreground">Anthropic (Claude)</strong> — generates AI insights. Only a pre-summarized snapshot of your finances is sent, on explicit request.</li>
              <li><strong className="text-foreground">Google</strong> — sign-in.</li>
              <li><strong className="text-foreground">Resend</strong> — delivers access-request notifications to the operator.</li>
              <li><strong className="text-foreground">Vercel</strong> — application hosting.</li>
            </ul>
          </Section>

          <Section title="Storage & security">
            <p>
              Data is stored in a Supabase (PostgreSQL) database. Every table enforces{" "}
              <strong className="text-foreground">row-level security</strong>: signed-in users can
              only ever read or write their <em>own</em> rows, so one user can never see another
              user&apos;s data. Traffic is served over HTTPS, and API keys are kept server-side.
            </p>
          </Section>

          <Section title="Who can access your data">
            <p>
              Be aware: as the database administrator, the operator has technical access to all
              stored data, including your transactions and bank tokens. This is inherent to running
              any hosted service — your data is not hidden from the operator. It is accessed only to
              run and maintain Financial Dashboard, never shared, and never sold. If that level of trust isn&apos;t
              right for you, please don&apos;t connect a live account.
            </p>
          </Section>

          <Section title="Retention & deletion">
            <p>
              Your data is kept while your account is active. You can request deletion of your
              account and all associated data at any time, and connected bank tokens can be revoked
              so Financial Dashboard loses access immediately. To do so, email the operator (below).
            </p>
          </Section>

          <Section title="Contact">
            <p>
              Questions, data requests, or deletion:{" "}
              <a
                href="mailto:lucasruiz1336@gmail.com?subject=Financial%20Dashboard%20privacy%20request"
                className="text-primary underline-offset-4 hover:underline"
              >
                lucasruiz1336@gmail.com
              </a>
              .
            </p>
          </Section>

          <Section title="Changes">
            <p>
              This policy may be updated as Financial Dashboard evolves; the date at the top reflects the latest
              version.
            </p>
          </Section>

          <p className="pt-4 text-sm">
            <Link href="/landing" className="text-primary underline-offset-4 hover:underline">
              ← Back to Financial Dashboard
            </Link>
          </p>
        </div>
      </main>
      <LandingFooter />
    </div>
  );
}
