-- ============================================================
-- Migration 020: Suggested users (Fase 7 — post-plan)
-- ------------------------------------------------------------
-- RPC: get_suggested_users(limit, offset) → paginated list of
-- users with is_discoverable=TRUE that the viewer can add as
-- friends. Excludes:
--   * viewer themselves (already excluded by friends_visible_profiles)
--   * bidirectional blocks (already excluded by friends_visible_profiles)
--   * existing friendships
--   * pending friend_requests in either direction
--   * rejected friend_requests where viewer was the sender
--     (respect the other party's "no")
--
-- Ranking:
--   1. Recently active (last_seen_at within 7 days) first.
--   2. Tiebreak by created_at DESC (newer signups first).
--
-- security_invoker: RLS evaluated as caller. friends_visible_profiles
-- is also security_invoker=true so auth.uid() resolves correctly.
--
-- Idempotent: safe to re-run.
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_suggested_users(
  p_limit  INT DEFAULT 20,
  p_offset INT DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  username TEXT,
  nickname TEXT,
  avatar_url TEXT,
  bio TEXT,
  last_seen_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ
)
LANGUAGE sql
SECURITY INVOKER
STABLE
SET search_path = public
AS $$
  SELECT
    p.id, p.username, p.nickname, p.avatar_url, p.bio,
    p.last_seen_at, p.created_at
  FROM public.friends_visible_profiles p
  WHERE p.is_discoverable = TRUE
    -- Defensive: p.id != auth.uid() also exists inside the view, but chained
    -- security_invoker (RPC → view → base table) can lose auth.uid() propagation
    -- in some Supabase setups, leaking the caller into their own suggestions.
    -- Repeat the filter at the RPC level as defense-in-depth.
    AND p.id <> auth.uid()
    AND NOT EXISTS (
      SELECT 1 FROM public.friendships f
      WHERE (f.user_a_id = auth.uid() AND f.user_b_id = p.id)
         OR (f.user_b_id = auth.uid() AND f.user_a_id = p.id)
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.friend_requests fr
      WHERE fr.status = 'pending'
        AND ((fr.sender_id = auth.uid() AND fr.receiver_id = p.id)
          OR (fr.sender_id = p.id        AND fr.receiver_id = auth.uid()))
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.friend_requests fr
      WHERE fr.status = 'rejected'
        AND fr.sender_id = auth.uid()
        AND fr.receiver_id = p.id
    )
  ORDER BY
    CASE WHEN p.last_seen_at > NOW() - INTERVAL '7 days' THEN 0 ELSE 1 END ASC,
    p.created_at DESC
  LIMIT  GREATEST(1, LEAST(p_limit, 50))
  OFFSET GREATEST(0, p_offset);
$$;

REVOKE ALL ON FUNCTION public.get_suggested_users(INT, INT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_suggested_users(INT, INT) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_suggested_users(INT, INT) TO authenticated;
