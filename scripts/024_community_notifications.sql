-- ============================================================
-- MFI – Más Fácil Imposible
-- Migration 024: Community notifications
--
-- Fires notification rows on votes/comments/replies targeting
-- content the user owns. SECURITY DEFINER bypasses the
-- `notifications_insert_own` RLS so user A's action can create
-- a row on user B's account.
--
-- Deduplication strategy: same pattern as send_linked_loan_request
-- — check for an existing UNREAD notification matching (recipient,
-- discriminator, source entity, actor); if present, skip.
--
-- Idempotent.
-- ============================================================

-- --------------------------------------------------------
-- VOTES → community_vote notification
-- --------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trg_community_vote_notify()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_owner_id      UUID;
  v_post_id       UUID;
  v_comment_id    UUID;
  v_post_title    TEXT;
  v_actor_name    TEXT;
BEGIN
  -- Only notify on new votes. Vote flips (UPDATE) do not produce
  -- additional notifications — the recipient was already told.
  IF TG_OP <> 'INSERT' THEN RETURN NEW; END IF;

  IF NEW.target_kind = 'post' THEN
    SELECT user_id, id, title
      INTO v_owner_id, v_post_id, v_post_title
    FROM public.community_posts
    WHERE id = NEW.target_id AND deleted_at IS NULL;
  ELSIF NEW.target_kind = 'comment' THEN
    SELECT c.user_id, c.post_id, c.id
      INTO v_owner_id, v_post_id, v_comment_id
    FROM public.community_comments c
    WHERE c.id = NEW.target_id AND c.deleted_at IS NULL;
    SELECT title INTO v_post_title
    FROM public.community_posts WHERE id = v_post_id;
  ELSE
    RETURN NEW;
  END IF;

  -- Target row is gone / soft-deleted → nothing to notify about.
  IF v_owner_id IS NULL THEN RETURN NEW; END IF;
  -- Don't notify yourself.
  IF v_owner_id = NEW.user_id THEN RETURN NEW; END IF;
  -- Only positive votes are "social" — downvotes silently affect the
  -- count but don't ping the author.
  IF NEW.value <> 1 THEN RETURN NEW; END IF;

  -- Dedup: if the same voter already has an unread upvote notification
  -- on this exact target, don't stack.
  IF EXISTS (
    SELECT 1 FROM public.notifications
    WHERE user_id = v_owner_id
      AND read = FALSE
      AND data->>'type' = 'community_vote'
      AND (data->>'actor_id')::UUID = NEW.user_id
      AND COALESCE(data->>'comment_id', '') = COALESCE(v_comment_id::TEXT, '')
      AND COALESCE(data->>'post_id', '') = COALESCE(v_post_id::TEXT, '')
  ) THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(nickname, username, 'alguien')
    INTO v_actor_name
  FROM public.profiles WHERE id = NEW.user_id;

  INSERT INTO public.notifications (user_id, type, title, message, data)
  VALUES (
    v_owner_id,
    'info',
    CASE
      WHEN NEW.target_kind = 'post' THEN 'Le gustó tu publicación'
      ELSE 'Le gustó tu comentario'
    END,
    v_actor_name || ' votó tu '
      || CASE WHEN NEW.target_kind = 'post' THEN 'publicación' ELSE 'comentario' END
      || COALESCE(' «' || LEFT(v_post_title, 60) || '»', '') || '.',
    jsonb_build_object(
      'type', 'community_vote',
      'target_kind', NEW.target_kind,
      'post_id', v_post_id,
      'comment_id', v_comment_id,
      'actor_id', NEW.user_id,
      'actor_name', v_actor_name
    )
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_community_vote_notify ON public.community_votes;
CREATE TRIGGER trg_community_vote_notify
  AFTER INSERT ON public.community_votes
  FOR EACH ROW EXECUTE FUNCTION public.trg_community_vote_notify();

-- --------------------------------------------------------
-- COMMENTS → community_comment / community_reply notification
-- --------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trg_community_comment_notify()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_post_owner     UUID;
  v_parent_owner   UUID;
  v_post_title     TEXT;
  v_actor_name     TEXT;
  v_recipient_id   UUID;
  v_notif_type     TEXT;
  v_notif_title    TEXT;
BEGIN
  IF TG_OP <> 'INSERT' THEN RETURN NEW; END IF;
  IF NEW.deleted_at IS NOT NULL THEN RETURN NEW; END IF;

  SELECT user_id, title INTO v_post_owner, v_post_title
  FROM public.community_posts WHERE id = NEW.post_id AND deleted_at IS NULL;

  IF v_post_owner IS NULL THEN RETURN NEW; END IF;

  IF NEW.parent_comment_id IS NULL THEN
    -- Top-level comment on a post → notify post owner.
    v_recipient_id := v_post_owner;
    v_notif_type   := 'community_comment';
    v_notif_title  := 'Nuevo comentario en tu publicación';
  ELSE
    SELECT user_id INTO v_parent_owner
    FROM public.community_comments
    WHERE id = NEW.parent_comment_id AND deleted_at IS NULL;
    IF v_parent_owner IS NULL THEN RETURN NEW; END IF;
    v_recipient_id := v_parent_owner;
    v_notif_type   := 'community_reply';
    v_notif_title  := 'Te respondieron';
  END IF;

  -- Don't notify yourself.
  IF v_recipient_id = NEW.user_id THEN RETURN NEW; END IF;

  SELECT COALESCE(nickname, username, 'alguien')
    INTO v_actor_name
  FROM public.profiles WHERE id = NEW.user_id;

  INSERT INTO public.notifications (user_id, type, title, message, data)
  VALUES (
    v_recipient_id,
    'info',
    v_notif_title,
    v_actor_name || ' '
      || CASE WHEN v_notif_type = 'community_reply' THEN 'respondió tu comentario' ELSE 'comentó tu publicación' END
      || COALESCE(' en «' || LEFT(v_post_title, 60) || '»', '') || '.',
    jsonb_build_object(
      'type', v_notif_type,
      'post_id', NEW.post_id,
      'comment_id', NEW.id,
      'parent_comment_id', NEW.parent_comment_id,
      'actor_id', NEW.user_id,
      'actor_name', v_actor_name
    )
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_community_comment_notify ON public.community_comments;
CREATE TRIGGER trg_community_comment_notify
  AFTER INSERT ON public.community_comments
  FOR EACH ROW EXECUTE FUNCTION public.trg_community_comment_notify();
