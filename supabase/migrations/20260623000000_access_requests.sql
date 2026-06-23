-- =============================================================================
-- MIGRATION: access_requests
-- =============================================================================
-- Adds the table backing the public landing page "Request Access" form.
-- Run this once on an existing database (new setups already get it via setup.sql).
--
--   Supabase Dashboard → SQL Editor → paste this file → Run
--
-- The table is operator-only: RLS is enabled with no policies, so only the
-- service role (used server-side by the API route) can read or write it.
-- =============================================================================

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
