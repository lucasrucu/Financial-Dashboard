<div align="center">

<img src="public/logo.png" alt="Qori" width="72" height="72" />

# Qori

**Every account, every currency, one clear picture.**

[![Next.js](https://img.shields.io/badge/Next.js-14-000000?logo=next.js&logoColor=white)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Supabase](https://img.shields.io/badge/Supabase-Postgres-3FCF8E?logo=supabase&logoColor=white)](https://supabase.com)
[![Plaid](https://img.shields.io/badge/Plaid-Bank%20data-000000?logo=plaid&logoColor=white)](https://plaid.com)
[![Claude](https://img.shields.io/badge/Claude-AI%20insights-D97757?logo=anthropic&logoColor=white)](https://www.anthropic.com)
[![Vercel](https://img.shields.io/badge/Vercel-Deployed-000000?logo=vercel&logoColor=white)](https://vercel.com)

### [▶ Explore the live demo →](https://qori.land/landing)

</div>

<!--
  Add a hero screenshot or GIF here. Capture the dashboard (or the /landing demo)
  and save it as docs/landing.png, then this image will render at the top of the README.
-->
<p align="center">
  <img src="docs/landing.png" alt="Qori dashboard" width="900" />
</p>

---

Qori is a personal finance platform that unifies a cross-border financial life into a single view. It pulls **live US bank accounts** through Plaid, parses **Peruvian BCP bank statements straight from PDF**, and imports **Fidelity brokerage holdings from CSV** — then normalizes everything to USD and puts an **AI analyst (Claude)** on top to turn the raw data into a candid monthly read on spending, savings, and portfolio moves. It's the end-to-end picture of a real product: multi-source data ingestion, authentication, an AI layer, and a deployed multi-currency UI.

> **Try it without an account:** the [live demo](https://qori.land/landing) runs the real interface on sample data — click through spending, transactions, investments, and AI insights.

---

## How it works

1. **Ingest** — connect US banks via Plaid for live transactions, upload BCP PDF statements (parsed server-side with `pdfjs-dist`), and import Fidelity positions from CSV.
2. **Normalize** — every monetary value is stored in USD; BCP amounts are converted at import time, and PEN is rendered on demand using a daily-cached exchange rate.
3. **Analyze** — on explicit request, transactions are pre-summarized and sent to Claude, which returns a structured analysis (wins, action items, flagged charges, goal allocations, portfolio moves). Results are cached for 24 hours.
4. **Track** — net worth (with manual balance anchoring), category breakdowns, savings goals, and investment gains — all in one dashboard, toggleable between USD and PEN.

---

## Features

- **Multi-source aggregation** — Plaid (US banks), BCP PDF statements, and Fidelity CSV in one unified ledger
- **AI insights** — on-demand spending + portfolio analysis via Claude, cached for 24 hours
- **Investments tracking** — positions, cost basis, and gains with AI hold/watch/sell suggestions
- **Multi-currency** — toggle USD ↔ PEN; stored in USD, converted at render time
- **Savings goals** — track progress toward named goals with deadlines
- **Manual balance anchoring** — override live Plaid balances for net-worth accuracy
- **Authentication** — Google OAuth and passkey sign-in via Supabase Auth; row-level security per user

---

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 14 App Router, TypeScript 5 strict |
| Database | Supabase (PostgreSQL) |
| Bank connectivity | Plaid SDK v42 |
| AI | Anthropic SDK — Claude Sonnet |
| State | Zustand (currency localStorage, AI insights sessionStorage) |
| Server cache | React Query (60 s stale time) |
| UI | shadcn/ui + Tailwind CSS v3 + Recharts |
| PDF parsing | pdfjs-dist (server-side) |
| Hosting | Vercel |

---

## Local Development

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

```bash
cp .env.example .env.local
```

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key (public) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server-only) |
| `PLAID_CLIENT_ID` | Plaid client ID |
| `PLAID_SECRET` | Plaid secret for the target environment |
| `PLAID_ENV` | `sandbox` \| `development` \| `production` |
| `ANTHROPIC_API_KEY` | Anthropic API key |
| `BCP_PDF_PASSWORD` | Password used to decrypt BCP PDF statements |

### 3. Set up the database

```
Supabase Dashboard → SQL Editor → paste contents of supabase/setup.sql → Run
```

### 4. Configure Google OAuth

1. **Supabase Dashboard** → Authentication → Providers → **Google** → Enable
2. Create OAuth credentials in [Google Cloud Console](https://console.cloud.google.com/apis/credentials) (type: Web application)
3. Add `http://localhost:3000` to Authorized JavaScript origins and `https://<project-ref>.supabase.co/auth/v1/callback` to Authorized redirect URIs
4. Copy the **Client ID** and **Client Secret** into Supabase — both are required
5. In Supabase → Authentication → URL Configuration, set Site URL to `http://localhost:3000` and add `http://localhost:3000/auth/callback` to Redirect URLs

See [docs/architecture.md](docs/architecture.md) for a full diagram of the auth flow and URL configuration table.

### 5. Start the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Signed-out visitors land on the public `/landing` page; signing in takes you to the dashboard.

---

## Docs

| Doc | Contents |
|---|---|
| [docs/architecture.md](docs/architecture.md) | System diagram, Google sign-in flow, request path, security decisions, project structure |
| [docs/deployment.md](docs/deployment.md) | Vercel deployment guide, environment variables, sharing with others (Google OAuth publishing) |
| [docs/database.md](docs/database.md) | Schema overview, key columns, row-level security |
