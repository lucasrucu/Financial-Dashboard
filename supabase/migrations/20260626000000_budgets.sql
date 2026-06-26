-- =============================================================================
-- MIGRATION: budgets
-- =============================================================================
-- Adds the table backing per-category spending limits ("budgets"). A budget is a
-- monthly cap on spending for one category. Run this once on an existing database
-- (new setups already get it via setup.sql).
--
--   Supabase Dashboard → SQL Editor → paste this file → Run
--
-- RLS is enabled with per-user policies (auth.uid() = user_id), matching every
-- other user-owned table. A unique index keeps one budget per category per user.
-- =============================================================================

create table if not exists budgets (
  id         uuid        primary key default gen_random_uuid(),
  user_id    uuid        not null references auth.users(id) on delete cascade,
  category   text        not null,
  amount     numeric     not null,
  period     text        not null default 'monthly',
  created_at timestamptz not null default now()
);

create index if not exists budgets_user_idx on budgets (user_id);
create unique index if not exists budgets_user_category_idx on budgets (user_id, category);

alter table budgets enable row level security;

drop policy if exists "budgets_select_own" on budgets;
create policy "budgets_select_own" on budgets for select using (auth.uid() = user_id);
drop policy if exists "budgets_insert_own" on budgets;
create policy "budgets_insert_own" on budgets for insert with check (auth.uid() = user_id);
drop policy if exists "budgets_update_own" on budgets;
create policy "budgets_update_own" on budgets for update using (auth.uid() = user_id);
drop policy if exists "budgets_delete_own" on budgets;
create policy "budgets_delete_own" on budgets for delete using (auth.uid() = user_id);
