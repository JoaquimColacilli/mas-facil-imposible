-- ============================================================
-- Migration 014: Social identity (Fase 1 — social feature)
-- ------------------------------------------------------------
-- 1. Adds username (unique, case-insensitive, format-checked),
--    bio (160 chars max), is_discoverable toggle (default false),
--    and username_changed_at for the 30-day rate limit.
-- 2. Creates profiles_public view exposing only safe columns,
--    granted to anon + authenticated for /add/:username preview.
--    Uses security_invoker = true (PG 15+) so RLS is enforced
--    against the caller, not the view owner.
--
-- Idempotent: safe to re-run.
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. profiles: social identity columns
-- ────────────────────────────────────────────────────────────
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS username             TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS username_changed_at  TIMESTAMPTZ;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_discoverable      BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bio                  TEXT;

COMMENT ON COLUMN public.profiles.username_changed_at IS
  'NULL on initial set. Set to NOW() on each subsequent change. Used for 30-day rate limit.';

-- ────────────────────────────────────────────────────────────
-- 2. Format constraints
-- ────────────────────────────────────────────────────────────
-- Username: 3-20 chars, lowercase alphanumeric + underscore,
-- cannot start or end with underscore (avoids _x_, x_, _x edge cases
-- that are confusing in URLs and parsing).
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'profiles_username_format' AND conrelid = 'public.profiles'::regclass
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_username_format
      CHECK (username IS NULL OR username ~ '^[a-z0-9][a-z0-9_]{1,18}[a-z0-9]$');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'profiles_bio_length' AND conrelid = 'public.profiles'::regclass
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_bio_length
      CHECK (bio IS NULL OR char_length(bio) <= 160);
  END IF;
END $$;

-- Case-insensitive unique index (partial — only on non-NULL usernames).
CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_lower_unique
  ON public.profiles (LOWER(username))
  WHERE username IS NOT NULL;

-- ────────────────────────────────────────────────────────────
-- 3. profiles_public view — only safe columns.
-- security_invoker = true: the view runs with the privileges of
-- the caller (anon or authenticated), not the view owner. Combined
-- with the WHERE clause, this guarantees that even with the GRANT
-- to anon, a viewer can ONLY see profiles where is_discoverable
-- is TRUE (or their own row, which is irrelevant for anon).
-- ────────────────────────────────────────────────────────────
DROP VIEW IF EXISTS public.profiles_public;
CREATE VIEW public.profiles_public
WITH (security_invoker = true)
AS
SELECT
  id,
  username,
  nickname,
  avatar_url,
  bio,
  is_discoverable,
  created_at
FROM public.profiles
WHERE is_discoverable = TRUE OR id = auth.uid();

GRANT SELECT ON public.profiles_public TO anon, authenticated;
