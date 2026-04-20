-- ============================================================
-- MFI – Más Fácil Imposible
-- Migration 027: @mention notifications for Community.
--
-- Posts/comments store HTML. Mentions are emitted by Tiptap as
-- <span data-type="mention" data-id="UUID" ...>@label</span>.
-- This trigger scans freshly-inserted bodies, extracts mentioned
-- user ids, and drops an `info` notification with
-- data.type = 'community_mention' for each one (skipping self).
--
-- Idempotent.
-- ============================================================

CREATE OR REPLACE FUNCTION public.extract_mention_ids(p_body TEXT)
RETURNS UUID[] LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE
  v_ids UUID[] := ARRAY[]::UUID[];
  v_match TEXT;
BEGIN
  IF p_body IS NULL OR p_body = '' THEN
    RETURN v_ids;
  END IF;
  -- Accept either attribute order: data-type first then data-id, or vice-versa.
  FOR v_match IN
    SELECT DISTINCT m[1]
    FROM regexp_matches(
      p_body,
      'data-type="mention"[^>]*?data-id="([0-9a-fA-F-]{36})"',
      'g'
    ) AS m
  LOOP
    v_ids := v_ids || v_match::UUID;
  END LOOP;
  FOR v_match IN
    SELECT DISTINCT m[1]
    FROM regexp_matches(
      p_body,
      'data-id="([0-9a-fA-F-]{36})"[^>]*?data-type="mention"',
      'g'
    ) AS m
  LOOP
    IF NOT (v_match::UUID = ANY (v_ids)) THEN
      v_ids := v_ids || v_match::UUID;
    END IF;
  END LOOP;
  RETURN v_ids;
END;
$$;

-- --------------------------------------------------------
-- POSTS → community_mention
-- --------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trg_community_post_mentions()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_actor_name  TEXT;
  v_ids         UUID[];
  v_target      UUID;
  v_old_ids     UUID[] := ARRAY[]::UUID[];
BEGIN
  IF TG_OP = 'INSERT' AND NEW.deleted_at IS NOT NULL THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND NEW.deleted_at IS NOT NULL THEN RETURN NEW; END IF;

  v_ids := public.extract_mention_ids(NEW.body);
  IF TG_OP = 'UPDATE' THEN
    v_old_ids := public.extract_mention_ids(OLD.body);
  END IF;

  IF array_length(v_ids, 1) IS NULL THEN RETURN NEW; END IF;

  SELECT COALESCE(nickname, username, 'alguien')
    INTO v_actor_name
  FROM public.profiles WHERE id = NEW.user_id;

  FOREACH v_target IN ARRAY v_ids LOOP
    -- Skip self + already-notified targets from a previous save.
    IF v_target = NEW.user_id THEN CONTINUE; END IF;
    IF v_target = ANY(v_old_ids) THEN CONTINUE; END IF;
    -- Skip if target doesn't exist.
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = v_target) THEN
      CONTINUE;
    END IF;

    INSERT INTO public.notifications (user_id, type, title, message, data)
    VALUES (
      v_target,
      'info',
      'Te mencionaron',
      v_actor_name || ' te mencionó en una publicación de Comunidad.',
      jsonb_build_object(
        'type',      'community_mention',
        'source',    'post',
        'post_id',   NEW.id,
        'actor_id',  NEW.user_id,
        'actor_name', v_actor_name
      )
    );
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_community_post_mentions ON public.community_posts;
CREATE TRIGGER trg_community_post_mentions
  AFTER INSERT OR UPDATE OF body ON public.community_posts
  FOR EACH ROW EXECUTE FUNCTION public.trg_community_post_mentions();

-- --------------------------------------------------------
-- COMMENTS → community_mention
-- --------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trg_community_comment_mentions()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_actor_name  TEXT;
  v_post_title  TEXT;
  v_ids         UUID[];
  v_target      UUID;
  v_old_ids     UUID[] := ARRAY[]::UUID[];
  v_post_owner  UUID;
  v_parent_owner UUID;
BEGIN
  IF TG_OP = 'INSERT' AND NEW.deleted_at IS NOT NULL THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND NEW.deleted_at IS NOT NULL THEN RETURN NEW; END IF;

  v_ids := public.extract_mention_ids(NEW.body);
  IF TG_OP = 'UPDATE' THEN
    v_old_ids := public.extract_mention_ids(OLD.body);
  END IF;
  IF array_length(v_ids, 1) IS NULL THEN RETURN NEW; END IF;

  SELECT user_id, title INTO v_post_owner, v_post_title
  FROM public.community_posts WHERE id = NEW.post_id;

  IF NEW.parent_comment_id IS NOT NULL THEN
    SELECT user_id INTO v_parent_owner
    FROM public.community_comments WHERE id = NEW.parent_comment_id;
  END IF;

  SELECT COALESCE(nickname, username, 'alguien')
    INTO v_actor_name
  FROM public.profiles WHERE id = NEW.user_id;

  FOREACH v_target IN ARRAY v_ids LOOP
    IF v_target = NEW.user_id THEN CONTINUE; END IF;
    IF v_target = ANY(v_old_ids) THEN CONTINUE; END IF;
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = v_target) THEN
      CONTINUE;
    END IF;
    -- De-dupe against the comment/reply trigger — if the mentioned user is
    -- already about to get a community_comment / community_reply ping for
    -- this exact comment, skip.
    IF v_target = v_post_owner AND NEW.parent_comment_id IS NULL THEN
      CONTINUE;
    END IF;
    IF v_target = v_parent_owner THEN
      CONTINUE;
    END IF;

    INSERT INTO public.notifications (user_id, type, title, message, data)
    VALUES (
      v_target,
      'info',
      'Te mencionaron',
      v_actor_name || ' te mencionó en un comentario'
        || COALESCE(' en «' || LEFT(v_post_title, 60) || '»', '') || '.',
      jsonb_build_object(
        'type',       'community_mention',
        'source',     'comment',
        'post_id',    NEW.post_id,
        'comment_id', NEW.id,
        'actor_id',   NEW.user_id,
        'actor_name', v_actor_name
      )
    );
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_community_comment_mentions ON public.community_comments;
CREATE TRIGGER trg_community_comment_mentions
  AFTER INSERT OR UPDATE OF body ON public.community_comments
  FOR EACH ROW EXECUTE FUNCTION public.trg_community_comment_mentions();
