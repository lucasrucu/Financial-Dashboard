# Financial Dashboard — Agent Reference

Personal finance dashboard: multi-source account aggregation (Plaid + BCP PDF),
AI-powered insights via Claude, USD/PEN multi-currency, savings goals tracking.

> Sub-docs: [Architecture](docs/architecture.md) · [Features](docs/features.md) · [Styles](docs/styles.md) · [Deployment](docs/deployment.md)

---

## Tech Stack (quick ref)

| Layer | Library |
|---|---|
| Framework | Next.js 14 App Router, TypeScript 5 strict |
| Database | Supabase (PostgreSQL + auth) |
| Bank data | Plaid SDK v42 |
| AI | Anthropic SDK — Claude Sonnet only |
| State | Zustand (currency pref, localStorage persist) |
| Server cache | React Query (staleTime 60 s, no window-focus refetch) |
| UI | shadcn/ui + Base UI + Tailwind CSS v3 |
| Charts | Recharts |
| PDF | pdfjs-dist (server-side, external package) |

---

## Absolute Rules

### Security
- API keys (`PLAID_*`, `ANTHROPIC_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`) **server-side only** — API routes or Server Components.
- `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are the only public env vars.
- Never commit `.env.local`.

### Data
- **All DB monetary values stored as USD.** Convert to PEN only at render time.
- Conversion logic lives **only** in `lib/currency.ts`. Do not duplicate it.
- Exchange rate cached in `exchange_rates` Supabase table; refresh once daily max.

### AI / Claude
- Call Claude **only on explicit user action** — never on page load or refetch.
- One call per analysis session; reuse `ai_cache` if record is < 24 h old.
- Pre-summarize transactions before sending (keep input ≤ 300 tokens).
- Every call: `model: "claude-sonnet-*"`, `max_tokens: 600`.

### TypeScript
- Strict mode enforced — **no `any` types**.
- Types live in `types/` — one file per domain (`transaction.ts`, `goal.ts`, `ai.ts`, `bcp.ts`, `plaid.ts`).

### Architecture
- Components are **dumb** (display only). Logic lives in `hooks/`.
- One file, one responsibility.
- No generic names (`Component.tsx`, `useData.ts`, etc.).
- No inline styles or custom CSS files unless Tailwind genuinely cannot cover it.

---

## Directory Map

```
app/
  (dashboard)/          # Route group — dashboard pages
    page.tsx            # Overview (/)
    transactions/       # Transactions list
    categories/         # Category management
    insights/           # AI insights
  login/                # Google OAuth + passkey sign-in
  auth/callback/        # OAuth callback handler
  api/                  # All API routes (server-only, see docs/architecture.md)
  layout.tsx / providers.tsx

components/
  ui/                   # shadcn primitives
  layout/               # Sidebar, TopNav, PageWrapper
  dashboard/            # Feature components (dumb, data-props only)

hooks/                  # All data-fetching & mutation logic
lib/
  supabase/
    client.ts           # Browser client (createBrowserClient via @supabase/ssr)
    server.ts           # Server client (createServerClient via @supabase/ssr)
  supabase.ts           # Admin client (getSupabaseAdmin — service role, server-only)
  plaid/
    sync-helpers.ts     # Shared Plaid account + transaction sync logic
  plaid.ts              # Plaid SDK client init
  auth.ts               # requireUser() — extracts user from session, used by all API routes
  anthropic.ts          # Claude client + analysis helper
  currency.ts           # USD ↔ PEN conversion (single source of truth)
  bcp/                  # BCP PDF parser, importer, category mapper
  accountBalance.ts     # Net-worth calculation with balance anchor override
  aggregates.ts         # Spending aggregation helpers
stores/                 # Zustand stores (currencyStore.ts, aiInsightStore.ts)
types/                  # TypeScript interfaces per domain
constants/              # categories.ts, currencies.ts
supabase/
  schema.sql            # Complete schema — run once per environment
  migrations/           # Incremental SQL migrations (timestamped)
```

---

## Key Invariants (do not break)

1. `source` column on `transactions` must be `'plaid'` or `'bcp'` — never null.
2. Balance anchor columns (`balance_anchor_usd`, `balance_anchor_date`, `balance_anchor_set_at`) live on `accounts` — they override live Plaid balance for net-worth calculation.
3. `statement_imports` table enforces dedup via `file_hash`; importing the same PDF twice must fail gracefully.
4. BCP transactions are stored in USD (converted from PEN at import time using the rate fetched at import moment).
5. React Query cache keys must stay consistent — changing a key silently breaks cache hits.

---

## Git Conventions

- Branches: `feature/`, `fix/`, `chore/`
- Commits: conventional (`feat:`, `fix:`, `chore:`, `refactor:`)

---

## Before Touching Code

1. Check which domain you're in (Plaid, BCP, AI, goals, currency, UI).
2. Read the relevant sub-doc linked at the top of this file.
3. Confirm env vars needed are server-side vs. public (see [Deployment](docs/deployment.md)).
