-- Financial Dashboard MVP schema

create extension if not exists "pgcrypto";

create table if not exists plaid_items (
  id uuid primary key default gen_random_uuid(),
  access_token text not null,
  item_id text unique not null,
  institution_name text,
  last_synced_at timestamptz
);

create table if not exists accounts (
  id uuid primary key default gen_random_uuid(),
  plaid_account_id text unique not null,
  plaid_item_id uuid references plaid_items(id) on delete cascade,
  name text not null,
  balance_usd numeric not null default 0,
  mask text,
  subtype text
);

create table if not exists transactions (
  id uuid primary key default gen_random_uuid(),
  plaid_transaction_id text unique not null,
  account_id uuid references accounts(id) on delete cascade,
  date date not null,
  name text not null,
  amount_usd numeric not null,
  category_id text not null,
  plaid_category text[],
  is_recurring boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists transactions_date_idx on transactions (date desc);
create index if not exists transactions_category_idx on transactions (category_id);
create index if not exists transactions_account_idx on transactions (account_id);

create table if not exists goals (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  target_usd numeric not null,
  saved_usd numeric not null default 0,
  deadline date
);

create table if not exists ai_cache (
  id uuid primary key default gen_random_uuid(),
  response_json jsonb not null,
  created_at timestamptz not null default now(),
  period text not null
);

create table if not exists exchange_rates (
  id uuid primary key default gen_random_uuid(),
  usd_to_pen numeric not null,
  fetched_at timestamptz not null default now()
);

insert into goals (name, target_usd, saved_usd, deadline)
select * from (values
  ('Bike fund', 800::numeric, 0::numeric, (current_date + interval '6 months')::date),
  ('Move-out fund', 3000::numeric, 0::numeric, (current_date + interval '12 months')::date),
  ('Trip fund', 1500::numeric, 0::numeric, (current_date + interval '9 months')::date)
) as seed(name, target_usd, saved_usd, deadline)
where not exists (select 1 from goals limit 1);
