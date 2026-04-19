-- ============================================================
-- Migration 013: Compliance fields (Fase 0 — social feature)
-- ------------------------------------------------------------
-- 1. Adds ToS / Privacy acceptance tracking to profiles.
-- 2. Audits ON DELETE CASCADE on user-owned tables that were
--    created outside the repo (loans, debts, portfolios,
--    portfolio_logs, mfi_sheets, feedbacks). Forces cascade
--    where missing so that auth.admin.deleteUser() removes
--    every trace of the user in a single call.
--
-- Idempotent: safe to re-run.
-- Hard delete strategy (no deleted_at column).
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. profiles: compliance columns
-- ────────────────────────────────────────────────────────────
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS tos_accepted_at      TIMESTAMPTZ;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS tos_version          TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS privacy_accepted_at  TIMESTAMPTZ;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS privacy_version      TEXT;

-- ────────────────────────────────────────────────────────────
-- 2. Cascade audit on tables created outside the repo.
-- profiles itself already cascades from auth.users (migration 001).
-- categories/transactions/goals/notifications also already cascade.
-- These six are the ones we cannot verify from source control.
-- ────────────────────────────────────────────────────────────
DO $$
DECLARE
  tbl_name TEXT;
  fk_name  TEXT;
  forced_count INT := 0;
  ok_count     INT := 0;
  skip_count   INT := 0;
BEGIN
  FOR tbl_name IN
    SELECT unnest(ARRAY['loans','debts','portfolios','portfolio_logs','mfi_sheets','feedbacks'])
  LOOP
    -- Skip silently if the table does not exist (defensive)
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = tbl_name
    ) THEN
      RAISE NOTICE 'Skipping %: table does not exist in this database', tbl_name;
      skip_count := skip_count + 1;
      CONTINUE;
    END IF;

    -- Look for an FK pointing at auth.users that is NOT cascade-on-delete
    SELECT con.conname INTO fk_name
    FROM pg_constraint con
    JOIN pg_class rel       ON rel.oid = con.conrelid
    JOIN pg_namespace ns    ON ns.oid = rel.relnamespace
    WHERE ns.nspname = 'public'
      AND rel.relname = tbl_name
      AND con.contype = 'f'
      AND con.confrelid = 'auth.users'::regclass
      AND con.confdeltype <> 'c'  -- 'c' = CASCADE; we want anything that ISN'T cascade
    LIMIT 1;

    IF fk_name IS NOT NULL THEN
      EXECUTE format('ALTER TABLE public.%I DROP CONSTRAINT %I', tbl_name, fk_name);
      EXECUTE format(
        'ALTER TABLE public.%I ADD CONSTRAINT %I FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE',
        tbl_name, fk_name
      );
      RAISE NOTICE 'Forced ON DELETE CASCADE on %.% (constraint: %)', 'public', tbl_name, fk_name;
      forced_count := forced_count + 1;
    ELSE
      RAISE NOTICE 'FK on public.% already cascades (or no FK to auth.users found), skipping', tbl_name;
      ok_count := ok_count + 1;
    END IF;
  END LOOP;

  RAISE NOTICE '── Cascade audit summary ──';
  RAISE NOTICE 'Forced cascade: %  |  Already OK / no FK: %  |  Table missing: %', forced_count, ok_count, skip_count;
END $$;
