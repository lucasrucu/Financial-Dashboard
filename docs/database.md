# Database Schema

Eight tables, all in a single Supabase (PostgreSQL) project. Run `supabase/setup.sql` once to create them.

| Table | Purpose |
|---|---|
| `categories` | Per-user spending categories (system defaults + custom) |
| `plaid_items` | One row per connected institution (Plaid or BCP) |
| `accounts` | Individual accounts within an institution |
| `transactions` | All transactions — `source` is always `'plaid'` or `'bcp'` |
| `goals` | Savings goals with target and current amounts |
| `ai_cache` | Cached Claude responses, keyed by period (TTL: 24 h) |
| `exchange_rates` | USD→PEN rates cached daily from Frankfurter API (global, shared across users) |
| `statement_imports` | BCP import history — deduplication via `file_hash` |

---

## Key Columns

### `accounts`

| Column | Notes |
|---|---|
| `balance_usd` | Live balance from Plaid |
| `balance_anchor_usd` | Manual override — used for net-worth when set |
| `balance_anchor_date` | Date the anchor was set |
| `balance_anchor_set_at` | Timestamp when anchor was saved |

Net-worth calculation uses `balance_anchor_usd` when present; falls back to `balance_usd`.

### `transactions`

| Column | Notes |
|---|---|
| `amount_usd` | Positive = debit (money out) |
| `source` | `'plaid'` or `'bcp'` — never null |
| `category_id` | References `constants/categories.ts` |
| `category_source` | `'auto'` (AI/rule-based) or `'manual'` (user-set) |

BCP transactions are converted from PEN to USD at import time using the rate for each transaction's date.

### `statement_imports`

Importing the same BCP PDF twice fails gracefully — the `file_hash` column has a unique constraint.

---

## Row-Level Security

All user-owned tables are scoped by `user_id` — users can only read and write their own rows. `exchange_rates` is global (no `user_id`) since rates are shared.
