alter table accounts
  add column if not exists balance_anchor_usd numeric,
  add column if not exists balance_anchor_date date,
  add column if not exists balance_anchor_set_at timestamptz;
