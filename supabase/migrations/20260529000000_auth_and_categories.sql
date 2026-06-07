-- LEGACY MIGRATION — skip this if you used supabase/setup.sql on a new project.
--
-- What is a migration?
--   A small, incremental change applied to an OLD database that already had data
--   before a feature was added. This one adds user_id columns and auth support
--   for databases created before Google login existed.
--
-- New users: run supabase/setup.sql only. Do NOT run this file.
-- Old users: run this once if your database predates auth, then you are done.

alter table plaid_items add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table accounts add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table transactions add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table transactions add column if not exists category_source text not null default 'auto';
alter table goals add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table statement_imports add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table ai_cache add column if not exists user_id uuid references auth.users(id) on delete cascade;

-- Categories table (if not created via full setup.sql)
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
