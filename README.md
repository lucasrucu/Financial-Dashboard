# Financial Dashboard

Personal finance dashboard that aggregates accounts from multiple sources, tracks spending, and surfaces AI-powered insights. Built for a US + Peru financial setup — supports Plaid-connected US bank accounts and BCP (Banco de Crédito del Perú) PDF statement imports with automatic USD/PEN conversion.

---

## Features

- **Multi-source aggregation** — Plaid (US banks) and BCP PDF statements in one unified view
- **AI insights** — on-demand spending analysis via Claude, cached for 24 hours
- **Multi-currency** — toggle between USD and PEN; all values stored in USD, converted at render time
- **Savings goals** — track progress toward named financial goals with deadlines
- **Manual balance anchoring** — override live Plaid balances for net-worth accuracy
- **Authentication** — Google OAuth and passkey sign-in via Supabase Auth; row-level security per user
- **Custom categories** — user-managed spending categories with AI-suggested colors

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

---

## Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) project
- A [Plaid](https://plaid.com) account (Sandbox is free)
- An [Anthropic](https://console.anthropic.com) API key

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

Open [http://localhost:3000](http://localhost:3000) — you'll be redirected to `/login` until signed in.

---

## Docs

| Doc | Contents |
|---|---|
| [docs/architecture.md](docs/architecture.md) | System diagram, Google sign-in flow, request path, security decisions, project structure |
| [docs/deployment.md](docs/deployment.md) | Vercel deployment guide, environment variables, sharing with others (Google OAuth publishing) |
| [docs/database.md](docs/database.md) | Schema overview, key columns, row-level security |
