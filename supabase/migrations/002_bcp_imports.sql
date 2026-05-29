-- BCP PDF statement import support

create table if not exists statement_imports (
  id uuid primary key default gen_random_uuid(),
  source text not null default 'bcp',
  account_code text not null,
  period_start date not null,
  period_end date not null,
  file_hash text unique not null,
  transaction_count integer not null default 0,
  imported_at timestamptz not null default now()
);

create index if not exists statement_imports_account_idx on statement_imports (account_code);
create index if not exists statement_imports_period_idx on statement_imports (period_start, period_end);

alter table transactions
  add column if not exists source text not null default 'plaid';

create index if not exists transactions_source_idx on transactions (source);
