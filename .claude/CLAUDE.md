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
  setup.sql             # Create database — run once per environment
  reset.sql             # Wipe financial data — keeps login
  migrations/           # Legacy upgrades only
```

---

## Key Invariants (do not break)

1. `source` column on `transactions` must be `'plaid'` or `'bcp'` — never null.
2. Balance anchor columns (`balance_anchor_usd`, `balance_anchor_date`, `balance_anchor_set_at`) live on `accounts` — they override live Plaid balance for net-worth calculation.
3. `statement_imports` table enforces dedup via `file_hash`; importing the same PDF twice must fail gracefully.
4. BCP transactions are stored in USD (converted from PEN at import time using the rate fetched at import moment).
5. React Query cache keys must stay consistent — changing a key silently breaks cache hits.

---

## Git Workflow

Follow Git Flow-style branching. Cursor equivalent: `.cursor/rules/git-workflow.mdc`.

### Branch naming

| Prefix | Use |
|--------|-----|
| `feature/` | New functionality (default) |
| `fix/` | Bug fixes |
| `chore/` | Tooling, deps, config |

### Auto-create branches

When starting new feature work, bug fixes, or chore tasks:

1. Check the current branch (`git branch --show-current`).
2. If on `master`, automatically create and switch to a prefixed branch before writing code.
3. Never commit directly to `master`.

### Auto-create commits

Create commits automatically as work completes — do not wait for the user to ask.

- One logical change per commit; stage only relevant files.
- Use Conventional Commits: `feat:`, `fix:`, `chore:`, `refactor:`, `docs:`.
- Professional messages: imperative mood, concise subject, body explaining *why* when non-obvious.
- Never commit `.env.local` or secrets.
- **No AI attribution** — commits must look human-authored only. Never add `Co-authored-by`, `Signed-off-by`, or any trailer referencing Cursor, Claude, Copilot, or other AI tools. Cursor may inject a `Co-authored-by` trailer via its commit hook — always amend it out before pushing. Use `--no-verify` only for that cleanup amend, not to bypass other checks.

### Merge gate (user confirmation required)

- **Never** merge into `master`, push to `master`, or open a merge PR unless the user explicitly requests it.
- **Never** force-push to `master`.
- **Never** skip hooks unless the user explicitly asks.

### Post-merge flow (run when user confirms merge)

After a successful merge into `master`, complete the full sync — do not stop at the local merge:

1. **Fetch** — `git fetch origin`
2. **Check incoming changes** — if `origin/master` is ahead of local `master`, merge `origin/master` into `master` and resolve conflicts before continuing.
3. **Clean up branches** — delete local branches fully merged into `master` (e.g. `git branch -d feature/...`). Delete the remote branch too if it exists and was merged (`git push origin --delete feature/...`).
4. **Sync to remote** — `git push origin master`
5. **Verify** — `git status` should show `master...origin/master` with no ahead/behind drift.

Only stop early if a merge conflict or push rejection needs user input.

When a feature is complete, remind the user:

> Work is on `feature/...`. Say when you want me to merge into `master`.

---

## Before Touching Code

1. Check which domain you're in (Plaid, BCP, AI, goals, currency, UI).
2. Read the relevant sub-doc linked at the top of this file.
3. Confirm env vars needed are server-side vs. public (see [Deployment](docs/deployment.md)).
