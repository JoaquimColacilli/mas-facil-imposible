-- ============================================================
-- MFI – Más Fácil Imposible
-- Migration 026: Karma / badges for the Community feature.
--
-- - Adds `karma` column on profiles (denormalized).
-- - Extends the community_votes trigger from 003 so that every
--   incoming vote on a post/comment also bumps the author's karma
--   (self-votes excluded; already excluded in notifications trigger).
-- - Backfills karma once from the current votes table.
-- - Recreates profiles_public so `karma` is exposed, honouring
--   the existing `show_badges` privacy flag (NULL when off).
--
-- Idempotent.
-- ============================================================

-- --------------------------------------------------------
-- 1. Column
-- --------------------------------------------------------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS karma INT NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.profiles.karma IS
  'Accumulated community votes received on posts + comments. Updated by trg_community_votes_bump (migration 026).';

-- --------------------------------------------------------
-- 2. Replace vote trigger: adds karma maintenance alongside
--    the existing vote_count maintenance from 003.
-- --------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trg_community_votes_bump()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_target_author UUID;
BEGIN
  -- Resolve the author of the target row so we can bump their karma.
  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    IF NEW.target_kind = 'post' THEN
      SELECT user_id INTO v_target_author FROM public.community_posts WHERE id = NEW.target_id;
    ELSIF NEW.target_kind = 'comment' THEN
      SELECT user_id INTO v_target_author FROM public.community_comments WHERE id = NEW.target_id;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.target_kind = 'post' THEN
      SELECT user_id INTO v_target_author FROM public.community_posts WHERE id = OLD.target_id;
    ELSIF OLD.target_kind = 'comment' THEN
      SELECT user_id INTO v_target_author FROM public.community_comments WHERE id = OLD.target_id;
    END IF;
  END IF;

  IF TG_OP = 'INSERT' THEN
    PERFORM public.apply_community_vote_delta(NEW.target_kind, NEW.target_id, NEW.value);
    IF v_target_author IS NOT NULL AND v_target_author <> NEW.user_id THEN
      UPDATE public.profiles
         SET karma = GREATEST(karma + NEW.value, 0)
       WHERE id = v_target_author;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.value <> NEW.value THEN
      PERFORM public.apply_community_vote_delta(NEW.target_kind, NEW.target_id, NEW.value - OLD.value);
      IF v_target_author IS NOT NULL AND v_target_author <> NEW.user_id THEN
        UPDATE public.profiles
           SET karma = GREATEST(karma + (NEW.value - OLD.value), 0)
         WHERE id = v_target_author;
      END IF;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM public.apply_community_vote_delta(OLD.target_kind, OLD.target_id, -OLD.value);
    IF v_target_author IS NOT NULL AND v_target_author <> OLD.user_id THEN
      UPDATE public.profiles
         SET karma = GREATEST(karma - OLD.value, 0)
       WHERE id = v_target_author;
    END IF;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

-- Trigger already exists from 003; CREATE OR REPLACE FUNCTION is enough,
-- but re-binding keeps this migration self-contained in case 003 was
-- never applied on this environment.
DROP TRIGGER IF EXISTS trg_community_votes_bump ON public.community_votes;
CREATE TRIGGER trg_community_votes_bump
  AFTER INSERT OR UPDATE OR DELETE ON public.community_votes
  FOR EACH ROW EXECUTE FUNCTION public.trg_community_votes_bump();

-- --------------------------------------------------------
-- 3. One-shot backfill — computes karma from the existing
--    community_votes + posts/comments relationships.
--    Self-votes excluded. Safe to re-run (idempotent because
--    we overwrite with the recomputed total).
-- --------------------------------------------------------
WITH author_votes AS (
  SELECT
    CASE v.target_kind
      WHEN 'post'    THEN (SELECT user_id FROM public.community_posts    WHERE id = v.target_id)
      WHEN 'comment' THEN (SELECT user_id FROM public.community_comments WHERE id = v.target_id)
    END AS author_id,
    v.user_id AS voter_id,
    v.value
  FROM public.community_votes v
)
UPDATE public.profiles p
   SET karma = COALESCE(totals.total, 0)
  FROM (
    SELECT author_id, GREATEST(SUM(value), 0)::INT AS total
    FROM author_votes
    WHERE author_id IS NOT NULL
      AND author_id <> voter_id
    GROUP BY author_id
  ) AS totals
 WHERE p.id = totals.author_id
   AND p.karma <> COALESCE(totals.total, 0);

-- --------------------------------------------------------
-- 4. Recreate profiles_public view to expose karma, honoring
--    show_badges (NULL when the user opted out).
-- --------------------------------------------------------
DROP VIEW IF EXISTS public.profiles_public;
CREATE VIEW public.profiles_public
WITH (security_invoker = true)
AS
SELECT
  id,
  username,
  nickname,
  avatar_url,
  CASE WHEN show_bio    THEN bio   ELSE NULL END AS bio,
  CASE WHEN show_badges THEN karma ELSE NULL END AS karma,
  show_streak,
  show_badges,
  is_discoverable,
  created_at
FROM public.profiles
WHERE is_discoverable = TRUE OR id = auth.uid();

GRANT SELECT ON public.profiles_public TO anon, authenticated;
