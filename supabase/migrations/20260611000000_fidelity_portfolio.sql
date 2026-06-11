-- Add Fidelity portfolio tables

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

alter table portfolio_snapshots enable row level security;
alter table stock_positions     enable row level security;

drop policy if exists "portfolio_snapshots_select_own" on portfolio_snapshots;
create policy "portfolio_snapshots_select_own" on portfolio_snapshots for select using (auth.uid() = user_id);
drop policy if exists "portfolio_snapshots_insert_own" on portfolio_snapshots;
create policy "portfolio_snapshots_insert_own" on portfolio_snapshots for insert with check (auth.uid() = user_id);
drop policy if exists "portfolio_snapshots_update_own" on portfolio_snapshots;
create policy "portfolio_snapshots_update_own" on portfolio_snapshots for update using (auth.uid() = user_id);
drop policy if exists "portfolio_snapshots_delete_own" on portfolio_snapshots;
create policy "portfolio_snapshots_delete_own" on portfolio_snapshots for delete using (auth.uid() = user_id);

drop policy if exists "stock_positions_select_own" on stock_positions;
create policy "stock_positions_select_own" on stock_positions for select using (auth.uid() = user_id);
drop policy if exists "stock_positions_insert_own" on stock_positions;
create policy "stock_positions_insert_own" on stock_positions for insert with check (auth.uid() = user_id);
drop policy if exists "stock_positions_update_own" on stock_positions;
create policy "stock_positions_update_own" on stock_positions for update using (auth.uid() = user_id);
drop policy if exists "stock_positions_delete_own" on stock_positions;
create policy "stock_positions_delete_own" on stock_positions for delete using (auth.uid() = user_id);
