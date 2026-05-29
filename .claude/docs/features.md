# Features

## 1. Account Aggregation

### Plaid (US banks)
Flow: `PlaidLink` → `/api/plaid/link-token` → Plaid Link UI → `/api/plaid/exchange-token` → accounts + transactions seeded in Supabase.
Re-sync: `BankAccountCard` triggers `POST /api/plaid/sync`.

Key files:
- `components/dashboard/PlaidLink.tsx` — link button, token fetch, exchange
- `components/dashboard/BankAccountCard.tsx` — account list, balance editing, sync trigger
- `lib/plaid.ts` — SDK wrapper
- `app/api/plaid/` — all Plaid routes

### BCP (Peruvian bank PDF)
Flow: upload PDF → `/api/bcp/parse` returns preview (no write) → user confirms → `/api/bcp/import` writes to DB.
- PDF parsing is **server-side only** (Node runtime, pdfjs-dist).
- Duplicate imports blocked via `file_hash` on `statement_imports`.
- BCP amounts are in PEN; converted to USD at import time using rate fetched at that moment.
- Warnings surface when parser confidence is low (ambiguous amounts, unrecognized descriptions).

Key files:
- `components/dashboard/BcpStatementUpload.tsx` — upload, preview, confirm
- `lib/bcp/parser.ts` — BCP-specific PDF text parser (has unit tests: `npm run test:bcp`)
- `lib/bcp/pdf.ts` — pdfjs-dist wrapper
- `lib/bcp/import.ts` — validation + Supabase write
- `app/api/bcp/parse|import` — routes

---

## 2. Transaction Management

- Paginated list with filters: date range, category, free-text search.
- Category can be edited inline; PATCH saves to `transactions.category_id`.
- Both Plaid and BCP transactions appear in the same table; `source` column differentiates them.
- `is_recurring` flag surfaced in UI for awareness.

Key files:
- `components/dashboard/TransactionTable.tsx`
- `hooks/useTransactions.ts`
- `app/api/plaid/transactions/route.ts`

---

## 3. Overview Dashboard

Aggregated stats shown on `/`:
- **Net worth**: sum of all account effective balances (anchor overrides live balance when set).
- **Monthly spending**: current month vs. previous month delta.
- **Top categories**: sorted by spend with color-coded badges.
- **Spending chart**: Recharts pie/doughnut by category.
- **Goals summary**: all goals with progress bars.

Key files:
- `components/dashboard/OverviewContent.tsx` — orchestrates all overview widgets
- `components/dashboard/SpendingChart.tsx` — Recharts chart
- `components/dashboard/GoalCard.tsx` — individual goal with edit modal
- `lib/aggregates.ts` — all roll-up calculations
- `lib/accountBalance.ts` — effective balance + net-worth
- `app/api/overview/route.ts`

---

## 4. AI Insights (Claude)

- Triggered **only** by explicit user action (button click in `/insights`).
- Checks `ai_cache` first; skips Claude if record < 24 h old (override with `?force=true`).
- Pre-summarized payload sent to Claude: income, spending totals, top categories, recurring merchants, savings rate, goals progress, flagged large transactions — **≤ 300 tokens input, 600 tokens output**.
- Response shape (`AiInsightResponse`): `roast` (witty summary), `wins` (positive highlights), `actions` (actionable advice), `flagged` (suspicious transactions), `allocations` (suggested budget map).

Key files:
- `components/dashboard/AiInsightPanel.tsx` — display only
- `hooks/useAiInsight.ts` — fetch + cache logic
- `lib/anthropic.ts` — Claude call with system prompt
- `app/api/ai/analyze/route.ts`
- `types/ai.ts` — `AiAnalysisPayload`, `AiInsightResponse`, `AiCache`

---

## 5. Savings Goals

CRUD for goals stored in `goals` table. Each goal has: name, `target_usd`, `saved_usd`, optional `deadline`.
- Progress bar rendered from `saved_usd / target_usd`.
- Edit modal updates all fields inline.

Key files:
- `components/dashboard/GoalCard.tsx`
- `hooks/useGoals.ts`
- `app/api/goals/route.ts`

---

## 6. Multi-Currency (USD / PEN)

- Currency preference stored in Zustand (`currencyStore.ts`), persisted to `localStorage` under key `financial-dashboard-currency`.
- Toggle in `TopNav` via `CurrencyToggle` component.
- All displayed amounts pass through `lib/currency.ts` — never convert inline.
- Exchange rate fetched from `exchange_rates` table (refreshed once daily via `/api/exchange-rate`).
- Fallback rate: **3.75** if API unavailable.

Key files:
- `stores/currencyStore.ts`
- `lib/currency.ts` — single source of truth for conversion + formatting
- `components/dashboard/CurrencyToggle.tsx`
- `hooks/useCurrency.ts`
- `constants/currencies.ts`

---

## 7. Balance Anchoring

Manual override for account balances used in net-worth calculation (useful when Plaid balance lags or BCP accounts have no live balance).

- Set via `BankAccountCard` edit form → `PATCH /api/accounts/[id]`.
- Columns on `accounts`: `balance_anchor_usd`, `balance_anchor_date`, `balance_anchor_set_at`.
- `lib/accountBalance.ts` decides which balance wins (anchor > live Plaid balance).
- Clearing anchor restores live Plaid balance.

---

## Component ↔ Hook ↔ API Map

| Feature | Component | Hook | API Route |
|---|---|---|---|
| Plaid connect | `PlaidLink` | — | `/api/plaid/link-token`, `/api/plaid/exchange-token` |
| Account list | `BankAccountCard` | — | `/api/accounts`, `/api/accounts/[id]` |
| BCP import | `BcpStatementUpload` | — | `/api/bcp/parse`, `/api/bcp/import` |
| Transactions | `TransactionTable` | `useTransactions` | `/api/plaid/transactions` |
| Overview stats | `OverviewContent` | — | `/api/overview` |
| Spending chart | `SpendingChart` | — | (data from overview) |
| Goals | `GoalCard` | `useGoals` | `/api/goals` |
| AI insights | `AiInsightPanel` | `useAiInsight` | `/api/ai/analyze` |
| Currency toggle | `CurrencyToggle` | `useCurrency` | `/api/exchange-rate` |
