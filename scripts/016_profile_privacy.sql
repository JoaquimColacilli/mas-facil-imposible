-- ============================================================
-- Migration 016: Profile privacy granular (Fase 3 — social feature)
-- ------------------------------------------------------------
-- Adds three boolean flags so each user controls what parts of
-- their public profile are visible to others. Recreates
-- profiles_public with the flags applied COLUMN-BY-COLUMN
-- (not row filter) — the row still exists, but sensitive columns
-- collapse to NULL when the user opts out.
--
-- Also adds the get_public_streak_dates RPC — canonical enforcement
-- point for show_streak. A viewer cannot bypass the flag even via
-- the network inspector.
--
-- Idempotent: safe to re-run.
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. profiles: privacy flags
-- ────────────────────────────────────────────────────────────
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS show_streak BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS show_badges BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS show_bio    BOOLEAN NOT NULL DEFAULT TRUE;

COMMENT ON COLUMN public.profiles.show_badges IS
  'Flag prepared for future badges system. No UI render yet in Fase 3.';

-- ────────────────────────────────────────────────────────────
-- 2. profiles_public view — recreated with flags applied.
-- Same security_invoker + GRANT contract as fase 1/2, plus:
-- - bio          collapses to NULL when show_bio = FALSE
-- - show_streak  exposed (consumer decides whether to fetch streak)
-- - show_badges  exposed (no consumer yet)
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
  CASE WHEN show_bio THEN bio ELSE NULL END AS bio,
  show_streak,
  show_badges,
  is_discoverable,
  created_at
FROM public.profiles
WHERE is_discoverable = TRUE OR id = auth.uid();

GRANT SELECT ON public.profiles_public TO anon, authenticated;

-- ────────────────────────────────────────────────────────────
-- 3. RPC: get_public_streak_dates(target_user_id UUID) → TEXT[]
-- Returns an array of ISO dates (last 90 days) where the target
-- has a portfolio_logs entry. NULL when:
--   - target does not exist
--   - target is not discoverable AND caller is not the owner
--   - show_streak = FALSE AND caller is not the owner
-- The caller then runs computeStreak() + isNonTradingDay() client-
-- side to produce the same streak the target sees in their widget.
--
-- SECURITY DEFINER because portfolio_logs RLS restricts reads to
-- the portfolio owner — this function is the narrow escape hatch.
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_public_streak_dates(target_user_id UUID)
RETURNS TEXT[]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id     UUID := auth.uid();
  v_discoverable  BOOLEAN;
  v_show_streak   BOOLEAN;
  v_dates         TEXT[];
BEGIN
  SELECT is_discoverable, show_streak
    INTO v_discoverable, v_show_streak
  FROM public.profiles
  WHERE id = target_user_id;

  IF v_discoverable IS NULL THEN
    RETURN NULL; -- target does not exist
  END IF;

  IF NOT v_discoverable AND v_caller_id <> target_user_id THEN
    RETURN NULL;
  END IF;

  IF NOT v_show_streak AND v_caller_id <> target_user_id THEN
    RETURN NULL;
  END IF;

  SELECT ARRAY(
    SELECT DISTINCT TO_CHAR(pl.date, 'YYYY-MM-DD')
    FROM public.portfolio_logs pl
    JOIN public.portfolios p ON p.id = pl.portfolio_id
    WHERE p.user_id = target_user_id
      AND pl.date >= (CURRENT_DATE - INTERVAL '90 days')
    ORDER BY 1 DESC
  ) INTO v_dates;

  RETURN COALESCE(v_dates, ARRAY[]::TEXT[]);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_streak_dates(UUID) TO authenticated;
