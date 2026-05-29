# Project Rules

## Always
- Read this file before touching any code
- Keep API keys server-side only (Next.js API routes or server components)
- Store all monetary values in USD internally; convert to PEN only at render time
- Cache Plaid and Claude responses — never call external APIs on every render
- Use TypeScript strict mode; no `any` types
- Keep components dumb; logic lives in hooks
- One file, one responsibility

## Never
- Put Plaid or Claude API keys in client-side code
- Call Claude more than once per analysis session (use cached response if < 24h old)
- Use inline styles or custom CSS files unless Tailwind cannot handle it
- Name components or hooks generically (no `Component.tsx`, `useData.ts`)

## Claude API Budget Rules
- Pre-summarize transaction data before sending to Claude (max ~300 tokens of input)
- Set max_tokens to 600 on every Claude call
- Use claude-sonnet for the main "roast" analysis only
- Never call Claude on page load — only on explicit user action

## Currency
- All DB values: USD
- Display: based on user's toggle (USD or PEN)
- Conversion logic: only in `lib/currency.ts`
- Exchange rate: cached in Supabase, refreshed once daily

## Git
- Branch naming: `feature/`, `fix/`, `chore/`
- Commit style: conventional commits (`feat:`, `fix:`, `chore:`, `refactor:`)
- Never commit `.env.local`
