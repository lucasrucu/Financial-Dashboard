-- =============================================================================
-- SETUP DATABASE — Financial Dashboard
-- =============================================================================
--
-- Run this ONCE when setting up a new Supabase project (local or production).
-- Safe to re-run — uses IF NOT EXISTS / DROP POLICY IF EXISTS throughout.
--
-- HOW TO RUN
--   1. Open Supabase Dashboard → SQL Editor → New query
--   2. Paste this entire file
--   3. Click Run
--   4. Configure Google OAuth in Authentication → Providers (see README.md)
--
-- OTHER SCRIPTS
--   reset.sql  — wipe financial data and start fresh (keeps your login)
--
-- You do NOT need anything in supabase/migrations/ for a new project.
-- Migrations are only for upgrading very old databases — see that folder.
--
-- =============================================================================

create extension if not exists "pgcrypto";

-- ─── Categories ───────────────────────────────────────────────────────────────

create table if not exists categories (
  id         text        not null,
  user_id    uuid        not null references auth.users(id) on delete cascade,
  label      text        not null,
  icon       text        not null default '📦',
  color      text        not null,
  is_system  boolean     not null default false,
  created_at timestamptz not null default now(),
  primary key (user_id, id)
);

create index if not exists categories_user_idx on categories (user_id);

-- ─── Institutions ─────────────────────────────────────────────────────────────

create table if not exists plaid_items (
  id               uuid        primary key default gen_random_uuid(),
  user_id          uuid        references auth.users(id) on delete cascade,
  access_token     text        not null,
  item_id          text        unique not null,
  institution_name text,
  last_synced_at   timestamptz
);

create index if not exists plaid_items_user_idx on plaid_items (user_id);

-- ─── Accounts ─────────────────────────────────────────────────────────────────

create table if not exists accounts (
  id                      uuid        primary key default gen_random_uuid(),
  user_id                 uuid        references auth.users(id) on delete cascade,
  plaid_account_id        text        unique not null,
  plaid_item_id           uuid        references plaid_items(id) on delete cascade,
  name                    text        not null,
  balance_usd             numeric     not null default 0,
  mask                    text,
  subtype                 text,
  balance_anchor_usd      numeric,
  balance_anchor_date     date,
  balance_anchor_set_at   timestamptz
);

create index if not exists accounts_user_idx on accounts (user_id);

-- ─── Transactions ─────────────────────────────────────────────────────────────

create table if not exists transactions (
  id                   uuid        primary key default gen_random_uuid(),
  user_id              uuid        references auth.users(id) on delete cascade,
  plaid_transaction_id text        unique not null,
  account_id           uuid        references accounts(id) on delete cascade,
  date                 date        not null,
  name                 text        not null,
  amount_usd           numeric     not null,
  category_id          text        not null,
  category_source      text        not null default 'auto',
  plaid_category       text[],
  is_recurring         boolean     not null default false,
  source               text        not null default 'plaid',
  created_at           timestamptz not null default now()
);

create index if not exists transactions_date_idx     on transactions (date desc);
create index if not exists transactions_category_idx on transactions (category_id);
create index if not exists transactions_account_idx  on transactions (account_id);
create index if not exists transactions_source_idx   on transactions (source);
create index if not exists transactions_user_idx     on transactions (user_id);

-- ─── BCP Statement Imports ────────────────────────────────────────────────────

create table if not exists statement_imports (
  id                uuid        primary key default gen_random_uuid(),
  user_id           uuid        references auth.users(id) on delete cascade,
  source            text        not null default 'bcp',
  account_code      text        not null,
  period_start      date        not null,
  period_end        date        not null,
  file_hash         text        unique not null,
  transaction_count integer     not null default 0,
  imported_at       timestamptz not null default now()
);

create index if not exists statement_imports_account_idx on statement_imports (account_code);
create index if not exists statement_imports_period_idx  on statement_imports (period_start, period_end);
create index if not exists statement_imports_user_idx    on statement_imports (user_id);

-- ─── Fidelity Portfolio ───────────────────────────────────────────────────────

create table if not exists portfolio_snapshots (
  id              uuid        primary key default gen_random_uuid(),
  user_id         uuid        references auth.users(id) on delete cascade not null,
  snapshot_date   date        not null,
  file_hash       text        unique not null,
  position_count  integer     not null default 0,
  total_value_usd numeric     not null default 0,
  imported_at     timestamptz not null default now()
);

create index if not exists portfolio_snapshots_user_idx on portfolio_snapshots (user_id);
create index if not exists portfolio_snapshots_date_idx on portfolio_snapshots (snapshot_date desc);

create table if not exists stock_positions (
  id                  uuid    primary key default gen_random_uuid(),
  user_id             uuid    references auth.users(id) on delete cascade not null,
  snapshot_id         uuid    references portfolio_snapshots(id) on delete cascade not null,
  ticker              text    not null,
  description         text,
  quantity            numeric,
  price_usd           numeric,
  current_value_usd   numeric not null,
  today_gain_usd      numeric,
  today_gain_pct      numeric,
  total_gain_usd      numeric,
  total_gain_pct      numeric,
  cost_basis_usd      numeric,
  avg_cost_basis_usd  numeric,
  is_money_market     boolean not null default false
);

create index if not exists stock_positions_snapshot_idx on stock_positions (snapshot_id);
create index if not exists stock_positions_user_idx     on stock_positions (user_id);

-- ─── Savings Goals ────────────────────────────────────────────────────────────

create table if not exists goals (
  id         uuid    primary key default gen_random_uuid(),
  user_id    uuid    references auth.users(id) on delete cascade,
  name       text    not null,
  target_usd numeric not null,
  saved_usd  numeric not null default 0,
  deadline   date
);

create index if not exists goals_user_idx on goals (user_id);

-- ─── AI Cache ─────────────────────────────────────────────────────────────────

create table if not exists ai_cache (
  id            uuid        primary key default gen_random_uuid(),
  user_id       uuid        references auth.users(id) on delete cascade,
  response_json jsonb       not null,
  created_at    timestamptz not null default now(),
  period        text        not null
);

create index if not exists ai_cache_user_idx on ai_cache (user_id);

-- ─── Exchange Rates (global, no user_id) ──────────────────────────────────────

create table if not exists exchange_rates (
  id         uuid        primary key default gen_random_uuid(),
  usd_to_pen numeric     not null,
  fetched_at timestamptz not null default now()
);

-- ─── Row Level Security ───────────────────────────────────────────────────────

alter table categories          enable row level security;
alter table plaid_items         enable row level security;
alter table accounts            enable row level security;
alter table transactions        enable row level security;
alter table statement_imports   enable row level security;
alter table portfolio_snapshots enable row level security;
alter table stock_positions     enable row level security;
alter table goals               enable row level security;
alter table ai_cache            enable row level security;
alter table exchange_rates      enable row level security;

-- Categories
drop policy if exists "categories_select_own" on categories;
create policy "categories_select_own" on categories for select using (auth.uid() = user_id);
drop policy if exists "categories_insert_own" on categories;
create policy "categories_insert_own" on categories for insert with check (auth.uid() = user_id);
drop policy if exists "categories_update_own" on categories;
create policy "categories_update_own" on categories for update using (auth.uid() = user_id);
drop policy if exists "categories_delete_own" on categories;
create policy "categories_delete_own" on categories for delete using (auth.uid() = user_id);

-- Plaid items
drop policy if exists "plaid_items_select_own" on plaid_items;
create policy "plaid_items_select_own" on plaid_items for select using (auth.uid() = user_id);
drop policy if exists "plaid_items_insert_own" on plaid_items;
create policy "plaid_items_insert_own" on plaid_items for insert with check (auth.uid() = user_id);
drop policy if exists "plaid_items_update_own" on plaid_items;
create policy "plaid_items_update_own" on plaid_items for update using (auth.uid() = user_id);
drop policy if exists "plaid_items_delete_own" on plaid_items;
create policy "plaid_items_delete_own" on plaid_items for delete using (auth.uid() = user_id);

-- Accounts
drop policy if exists "accounts_select_own" on accounts;
create policy "accounts_select_own" on accounts for select using (auth.uid() = user_id);
drop policy if exists "accounts_insert_own" on accounts;
create policy "accounts_insert_own" on accounts for insert with check (auth.uid() = user_id);
drop policy if exists "accounts_update_own" on accounts;
create policy "accounts_update_own" on accounts for update using (auth.uid() = user_id);
drop policy if exists "accounts_delete_own" on accounts;
create policy "accounts_delete_own" on accounts for delete using (auth.uid() = user_id);

-- Transactions
drop policy if exists "transactions_select_own" on transactions;
create policy "transactions_select_own" on transactions for select using (auth.uid() = user_id);
drop policy if exists "transactions_insert_own" on transactions;
create policy "transactions_insert_own" on transactions for insert with check (auth.uid() = user_id);
drop policy if exists "transactions_update_own" on transactions;
create policy "transactions_update_own" on transactions for update using (auth.uid() = user_id);
drop policy if exists "transactions_delete_own" on transactions;
create policy "transactions_delete_own" on transactions for delete using (auth.uid() = user_id);

-- Statement imports
drop policy if exists "statement_imports_select_own" on statement_imports;
create policy "statement_imports_select_own" on statement_imports for select using (auth.uid() = user_id);
drop policy if exists "statement_imports_insert_own" on statement_imports;
create policy "statement_imports_insert_own" on statement_imports for insert with check (auth.uid() = user_id);
drop policy if exists "statement_imports_update_own" on statement_imports;
create policy "statement_imports_update_own" on statement_imports for update using (auth.uid() = user_id);
drop policy if exists "statement_imports_delete_own" on statement_imports;
create policy "statement_imports_delete_own" on statement_imports for delete using (auth.uid() = user_id);

-- Portfolio snapshots
drop policy if exists "portfolio_snapshots_select_own" on portfolio_snapshots;
create policy "portfolio_snapshots_select_own" on portfolio_snapshots for select using (auth.uid() = user_id);
drop policy if exists "portfolio_snapshots_insert_own" on portfolio_snapshots;
create policy "portfolio_snapshots_insert_own" on portfolio_snapshots for insert with check (auth.uid() = user_id);
drop policy if exists "portfolio_snapshots_update_own" on portfolio_snapshots;
create policy "portfolio_snapshots_update_own" on portfolio_snapshots for update using (auth.uid() = user_id);
drop policy if exists "portfolio_snapshots_delete_own" on portfolio_snapshots;
create policy "portfolio_snapshots_delete_own" on portfolio_snapshots for delete using (auth.uid() = user_id);

-- Stock positions
drop policy if exists "stock_positions_select_own" on stock_positions;
create policy "stock_positions_select_own" on stock_positions for select using (auth.uid() = user_id);
drop policy if exists "stock_positions_insert_own" on stock_positions;
create policy "stock_positions_insert_own" on stock_positions for insert with check (auth.uid() = user_id);
drop policy if exists "stock_positions_update_own" on stock_positions;
create policy "stock_positions_update_own" on stock_positions for update using (auth.uid() = user_id);
drop policy if exists "stock_positions_delete_own" on stock_positions;
create policy "stock_positions_delete_own" on stock_positions for delete using (auth.uid() = user_id);

-- Goals
drop policy if exists "goals_select_own" on goals;
create policy "goals_select_own" on goals for select using (auth.uid() = user_id);
drop policy if exists "goals_insert_own" on goals;
create policy "goals_insert_own" on goals for insert with check (auth.uid() = user_id);
drop policy if exists "goals_update_own" on goals;
create policy "goals_update_own" on goals for update using (auth.uid() = user_id);
drop policy if exists "goals_delete_own" on goals;
create policy "goals_delete_own" on goals for delete using (auth.uid() = user_id);

-- AI cache
drop policy if exists "ai_cache_select_own" on ai_cache;
create policy "ai_cache_select_own" on ai_cache for select using (auth.uid() = user_id);
drop policy if exists "ai_cache_insert_own" on ai_cache;
create policy "ai_cache_insert_own" on ai_cache for insert with check (auth.uid() = user_id);
drop policy if exists "ai_cache_update_own" on ai_cache;
create policy "ai_cache_update_own" on ai_cache for update using (auth.uid() = user_id);
drop policy if exists "ai_cache_delete_own" on ai_cache;
create policy "ai_cache_delete_own" on ai_cache for delete using (auth.uid() = user_id);

-- Exchange rates (global read/write for authenticated users)
drop policy if exists "exchange_rates_select_auth" on exchange_rates;
create policy "exchange_rates_select_auth" on exchange_rates for select to authenticated using (true);
drop policy if exists "exchange_rates_insert_auth" on exchange_rates;
create policy "exchange_rates_insert_auth" on exchange_rates for insert to authenticated with check (true);

-- ─── Access Requests ──────────────────────────────────────────────────────────
-- Public landing page "Request Access" submissions. Written only by the server
-- (service role), never by end users. RLS is enabled with NO policies, so the
-- anon/authenticated keys can neither read nor write it — only the service role
-- (which bypasses RLS) can. The operator reads these in the Supabase dashboard.

create table if not exists access_requests (
  id         uuid        primary key default gen_random_uuid(),
  email      text        not null,
  note       text,
  ip         text,
  user_agent text,
  status     text        not null default 'pending',
  created_at timestamptz not null default now()
);

create index if not exists access_requests_created_idx on access_requests (created_at desc);
create index if not exists access_requests_email_idx on access_requests (lower(email));

alter table access_requests enable row level security;

-- ─── Seed Data ────────────────────────────────────────────────────────────────
-- Starter goals are inserted per-user via the app on first login.
-- System categories are seeded via GET /api/categories when a user has none.
