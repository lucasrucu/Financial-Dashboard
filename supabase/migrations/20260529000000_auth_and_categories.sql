-- Migration for existing databases (pre-auth) — run once in Supabase SQL Editor.
-- Adds user_id columns, categories table, category_source, and RLS policies.

alter table plaid_items add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table accounts add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table transactions add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table transactions add column if not exists category_source text not null default 'auto';
alter table goals add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table statement_imports add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table ai_cache add column if not exists user_id uuid references auth.users(id) on delete cascade;

-- Categories table (if not created via full schema.sql)
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

-- After first login, POST /api/auth/migrate-data assigns your user_id to orphan rows.
-- Or manually: UPDATE plaid_items SET user_id = '<your-uuid>' WHERE user_id IS NULL;
