# Deployment

## Environment Variables

### Server-side only (never expose to client)
| Variable | Purpose |
|---|---|
| `PLAID_CLIENT_ID` | Plaid API client ID |
| `PLAID_SECRET` | Plaid API secret |
| `PLAID_ENV` | `sandbox` / `development` / `production` |
| `ANTHROPIC_API_KEY` | Claude API key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase admin key (bypasses RLS) |

### Public (safe for client)
| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/public key |

### Optional
| Variable | Default | Purpose |
|---|---|---|
| `EXCHANGE_RATE_API_URL` | `https://api.frankfurter.app` | Override exchange rate source |
| `BCP_PDF_PASSWORD` | — | Pre-set PDF password for BCP statements |

Copy `.env.example` to `.env.local` and fill all required values. **Never commit `.env.local`.**

---

## Local Development

### Prerequisites
- Node.js 18+
- Supabase project (free tier works)
- Plaid sandbox account
- Anthropic API key

### Setup

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env.local
# Fill in all required values

# 3. Run Supabase migrations in order via SQL Editor or supabase CLI:
#   supabase/migrations/001_initial.sql
#   supabase/migrations/002_bcp_imports.sql
#   supabase/migrations/003_balance_anchor.sql

# 4. Start dev server
npm run dev
# Open http://localhost:3000
```

### Other Commands

```bash
npm run build      # Production build + type check
npm run lint       # ESLint
npm run test:bcp   # BCP parser unit tests (uses tsx)
```

---

## Production Deployment (Vercel)

No `vercel.json` required — Vercel auto-detects Next.js.

1. Push repo to GitHub.
2. Import in Vercel dashboard.
3. Add all env vars under **Settings → Environment Variables**.
4. Deploy.

### Production Checklist
- Set `PLAID_ENV=production` (or `development` for extended sandbox).
- Enable **connection pooling** (PgBouncer) in Supabase for serverless compatibility.
- The app is single-user with no auth middleware — add Supabase Auth or middleware protection before exposing publicly.

---

## PDF Processing Note

`pdfjs-dist` runs server-side only. It is declared in `serverComponentsExternalPackages` in `next.config.mjs` to prevent browser bundling. Never move PDF logic to client components.

---

## Exchange Rate Fallback

`lib/currency.ts` falls back to a hardcoded rate of **3.75 USD→PEN** if the exchange rate API is unreachable. Acceptable for brief outages only.
