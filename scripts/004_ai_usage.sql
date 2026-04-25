-- ============================================================
-- Migration 004: AI usage tracking for rate limiting
-- One row per AI feature invocation. Used to enforce per-user
-- daily quotas (e.g. 20 image analyses per rolling 24h).
-- ============================================================

CREATE TABLE IF NOT EXISTS public.ai_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  feature text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ai_usage_user_feature_created_idx
  ON public.ai_usage (user_id, feature, created_at DESC);

ALTER TABLE public.ai_usage ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ai_usage_select_own" ON public.ai_usage;
CREATE POLICY "ai_usage_select_own"
  ON public.ai_usage FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "ai_usage_insert_own" ON public.ai_usage;
CREATE POLICY "ai_usage_insert_own"
  ON public.ai_usage FOR INSERT
  WITH CHECK (auth.uid() = user_id);
