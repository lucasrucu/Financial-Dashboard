-- =============================================================================
-- RESET DATABASE — Financial Dashboard
-- =============================================================================
--
-- WHAT THIS DOES
--   Deletes all financial data: Plaid links, accounts, transactions, BCP
--   imports, goals, categories, and AI cache.
--   Does NOT delete your login — Supabase Auth users are untouched.
--
-- WHEN TO USE
--   - Switching from Plaid sandbox to production
--   - Clearing test/sandbox data before connecting real banks
--   - Starting over without losing your Google sign-in
--
-- HOW TO RUN
--   1. Open Supabase Dashboard → SQL Editor → New query
--   2. Set TARGET_EMAIL below (your login email, or NULL for all users)
--   3. Paste this entire file and click Run
--   4. Restart your dev server if running, then reconnect banks in the app
--
-- AFTER RESET
--   - Set PLAID_ENV=production in .env.local (if using real banks)
--   - Open the dashboard → Connect bank via Plaid Link
--
-- =============================================================================

DO $$
DECLARE
  -- Set to your login email to wipe only your data.
  -- Set to NULL to wipe financial data for ALL users.
  target_email text := 'your-email@gmail.com';

  target_uid uuid;
BEGIN
  IF target_email IS NOT NULL THEN
    SELECT id INTO target_uid
    FROM auth.users
    WHERE email = target_email;

    IF target_uid IS NULL THEN
      RAISE EXCEPTION 'No user found with email: %. Check TARGET_EMAIL at the top of reset.sql.', target_email;
    END IF;

    -- plaid_items cascades to accounts → transactions
    DELETE FROM plaid_items WHERE user_id = target_uid;
    DELETE FROM statement_imports WHERE user_id = target_uid;
    DELETE FROM goals WHERE user_id = target_uid;
    DELETE FROM ai_cache WHERE user_id = target_uid;
    DELETE FROM categories WHERE user_id = target_uid;

    -- Legacy rows from before auth (sandbox era, no user_id)
    DELETE FROM plaid_items WHERE user_id IS NULL;
    DELETE FROM accounts WHERE user_id IS NULL;
    DELETE FROM transactions WHERE user_id IS NULL;
    DELETE FROM statement_imports WHERE user_id IS NULL;
    DELETE FROM goals WHERE user_id IS NULL;
    DELETE FROM ai_cache WHERE user_id IS NULL;

    RAISE NOTICE 'Reset complete for user: %', target_email;
  ELSE
    TRUNCATE
      transactions,
      accounts,
      plaid_items,
      statement_imports,
      goals,
      ai_cache,
      categories,
      exchange_rates
    RESTART IDENTITY CASCADE;

    RAISE NOTICE 'Reset complete — all financial data wiped.';
  END IF;
END $$;
