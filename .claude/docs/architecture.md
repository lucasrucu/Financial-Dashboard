# Architecture

## Data Flow Overview

```
Browser
  └── React Query hook  ──► Next.js API route  ──► Supabase / Plaid / Claude
         (60s stale)           (server-only)           (cached in DB)
```

- **No client-side secrets.** All external SDK calls (Plaid, Anthropic, Supabase admin) happen inside `app/api/`.
- **Supabase anon key** is used client-side only for reading public data (exchange rates). Writes go through API routes using the service-role key.

---

## Supabase Schema

### `plaid_items`
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| access_token | text | encrypted, server-only |
| item_id | text | Plaid item ID |
| institution_name | text | |
| last_synced_at | timestamptz | updated on every sync |

### `accounts`
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| plaid_item_id | uuid FK | → plaid_items |
| plaid_account_id | text | unique |
| name | text | |
| mask | text | last 4 digits |
| subtype | text | checking, savings, etc. |
| balance_usd | numeric | live balance from Plaid |
| balance_anchor_usd | numeric | manual override |
| balance_anchor_date | date | date anchor was set |
| balance_anchor_set_at | timestamptz | when anchor was saved |

> Net-worth uses `balance_anchor_usd` when set; falls back to `balance_usd`.

### `transactions`
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| account_id | uuid FK | → accounts |
| plaid_transaction_id | text | unique, null for BCP |
| date | date | indexed |
| name | text | merchant/description |
| amount_usd | numeric | positive = debit |
| category_id | text | indexed; see `constants/categories.ts` |
| plaid_category | text[] | raw Plaid category array |
| is_recurring | boolean | |
| source | text | **'plaid' or 'bcp' — never null** |

### `goals`
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| name | text | |
| target_usd | numeric | |
| saved_usd | numeric | |
| deadline | date | nullable |

### `ai_cache`
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| period | text | e.g. "2025-05" |
| response_json | jsonb | full `AiInsightResponse` |
| created_at | timestamptz | checked vs 24 h threshold |

### `exchange_rates`
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| usd_to_pen | numeric | |
| fetched_at | timestamptz | refresh once daily |

### `statement_imports`
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| account_code | text | BCP account identifier |
| period_start | date | |
| period_end | date | |
| file_hash | text | **unique — prevents duplicate imports** |
| transaction_count | int | |

---

## API Routes

| Route | Method | Purpose |
|---|---|---|
| `/api/plaid/link-token` | POST | Create Plaid Link token |
| `/api/plaid/exchange-token` | POST | Exchange public token → access token; seed accounts & transactions |
| `/api/plaid/sync` | POST | Pull latest transactions from Plaid |
| `/api/plaid/transactions` | GET | Paginated transaction list with filters |
| `/api/plaid/transactions` | PATCH | Update category on a transaction |
| `/api/bcp/parse` | POST | Upload PDF → return preview (no DB write) |
| `/api/bcp/import` | POST | Confirm import → write transactions; dedup via `file_hash` |
| `/api/accounts` | GET | List accounts with effective balances |
| `/api/accounts/[id]` | PATCH | Set or clear balance anchor |
| `/api/goals` | GET | List all goals |
| `/api/goals` | PATCH | Create / update goal |
| `/api/exchange-rate` | GET | Current USD→PEN rate (cached 24 h) |
| `/api/overview` | GET | Aggregated stats: net worth, spending, top categories |
| `/api/ai/analyze` | GET | Claude analysis; `?force=true` bypasses cache |

---

## Key Libraries — Server Side

| File | Responsibility |
|---|---|
| `lib/supabase.ts` | Admin client factory (service-role key) |
| `lib/plaid.ts` | Plaid SDK: link-token, exchange, transaction fetch |
| `lib/anthropic.ts` | Claude call with roast system prompt |
| `lib/currency.ts` | Exchange rate fetch, USD↔PEN conversion, formatting |
| `lib/aggregates.ts` | Complex financial roll-ups (spending by category, monthly delta) |
| `lib/accountBalance.ts` | Effective balance logic (anchor vs. live), net-worth total |
| `lib/bcp/parser.ts` | BCP PDF text → structured transactions |
| `lib/bcp/pdf.ts` | pdfjs-dist extraction (Node runtime only) |
| `lib/bcp/import.ts` | Validation, dedup, and Supabase write for BCP imports |
| `lib/bcp/categories.ts` | BCP description → category ID mapping |

---

## Next.js Config Notes

- `pdfjs-dist` declared as `serverComponentsExternalPackages` — keeps it out of the browser bundle.
- No custom rewrites or headers configured; Vercel defaults apply.
