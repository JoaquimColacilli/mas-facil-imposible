-- ============================================================
-- Migration 015: Social graph (Fase 2 — social feature)
-- ------------------------------------------------------------
-- Tables: friend_requests, friendships, blocks
-- View:   friends_visible_profiles (excludes bidirectional blocks)
-- RPCs:   send_friend_request, accept_friend_request, block_user
--         (operations that need atomicity or service-definer privs)
--
-- Idempotent: safe to re-run.
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. friend_requests
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.friend_requests (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id   UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status      TEXT NOT NULL DEFAULT 'pending'
              CHECK (status IN ('pending','accepted','rejected','cancelled')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT friend_requests_no_self CHECK (sender_id <> receiver_id)
);

-- At most one pending request between any pair (in either direction).
-- LEAST/GREATEST normalizes the pair so (A→B) and (B→A) collide.
CREATE UNIQUE INDEX IF NOT EXISTS friend_requests_no_dup_pending
  ON public.friend_requests (LEAST(sender_id, receiver_id), GREATEST(sender_id, receiver_id))
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS friend_requests_receiver_pending_idx
  ON public.friend_requests (receiver_id) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS friend_requests_sender_pending_idx
  ON public.friend_requests (sender_id) WHERE status = 'pending';

ALTER TABLE public.friend_requests ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='friend_requests' AND policyname='friend_requests_select') THEN
    CREATE POLICY "friend_requests_select" ON public.friend_requests
      FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='friend_requests' AND policyname='friend_requests_insert') THEN
    -- send_friend_request RPC bypasses this with SECURITY DEFINER, but we keep
    -- a sane policy in case any other code path inserts directly.
    CREATE POLICY "friend_requests_insert" ON public.friend_requests
      FOR INSERT WITH CHECK (auth.uid() = sender_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='friend_requests' AND policyname='friend_requests_update') THEN
    -- Receiver can accept/reject; sender can cancel.
    CREATE POLICY "friend_requests_update" ON public.friend_requests
      FOR UPDATE USING (auth.uid() = sender_id OR auth.uid() = receiver_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='friend_requests' AND policyname='friend_requests_delete') THEN
    CREATE POLICY "friend_requests_delete" ON public.friend_requests
      FOR DELETE USING (auth.uid() = sender_id);
  END IF;
END $$;

-- ────────────────────────────────────────────────────────────
-- 2. friendships (canonical order: user_a_id < user_b_id)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.friendships (
  user_a_id   UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  user_b_id   UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_a_id, user_b_id),
  CONSTRAINT friendships_canonical_order CHECK (user_a_id < user_b_id)
);

CREATE INDEX IF NOT EXISTS friendships_user_b_idx ON public.friendships (user_b_id);

ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='friendships' AND policyname='friendships_select') THEN
    CREATE POLICY "friendships_select" ON public.friendships
      FOR SELECT USING (auth.uid() = user_a_id OR auth.uid() = user_b_id);
  END IF;
  -- NO insert policy: only the accept_friend_request RPC writes here (SECURITY DEFINER bypass).
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='friendships' AND policyname='friendships_delete') THEN
    CREATE POLICY "friendships_delete" ON public.friendships
      FOR DELETE USING (auth.uid() = user_a_id OR auth.uid() = user_b_id);
  END IF;
END $$;

-- ────────────────────────────────────────────────────────────
-- 3. blocks (silencioso: solo el blocker ve sus blocks)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.blocks (
  blocker_id  UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  blocked_id  UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (blocker_id, blocked_id),
  CONSTRAINT blocks_no_self CHECK (blocker_id <> blocked_id)
);

CREATE INDEX IF NOT EXISTS blocks_blocked_idx ON public.blocks (blocked_id);

ALTER TABLE public.blocks ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='blocks' AND policyname='blocks_select_own') THEN
    CREATE POLICY "blocks_select_own" ON public.blocks
      FOR SELECT USING (auth.uid() = blocker_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='blocks' AND policyname='blocks_insert_own') THEN
    CREATE POLICY "blocks_insert_own" ON public.blocks
      FOR INSERT WITH CHECK (auth.uid() = blocker_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='blocks' AND policyname='blocks_delete_own') THEN
    CREATE POLICY "blocks_delete_own" ON public.blocks
      FOR DELETE USING (auth.uid() = blocker_id);
  END IF;
END $$;

-- ────────────────────────────────────────────────────────────
-- 4. friends_visible_profiles view
-- Public columns of OTHER users, excluding bidirectional blocks.
-- security_invoker = true: RLS evaluated against the caller.
-- GRANT only to authenticated — anon must NOT see this.
-- ────────────────────────────────────────────────────────────
DROP VIEW IF EXISTS public.friends_visible_profiles;
CREATE VIEW public.friends_visible_profiles
WITH (security_invoker = true)
AS
SELECT
  p.id, p.username, p.nickname, p.avatar_url, p.bio,
  p.is_discoverable, p.created_at
FROM public.profiles p
WHERE auth.uid() IS NOT NULL
  AND p.id <> auth.uid()
  AND NOT EXISTS (
    SELECT 1 FROM public.blocks b
    WHERE (b.blocker_id = auth.uid() AND b.blocked_id = p.id)
       OR (b.blocker_id = p.id        AND b.blocked_id = auth.uid())
  );

-- Explicit: revoke public + grant only authenticated.
REVOKE ALL ON public.friends_visible_profiles FROM PUBLIC;
REVOKE ALL ON public.friends_visible_profiles FROM anon;
GRANT SELECT ON public.friends_visible_profiles TO authenticated;

-- ────────────────────────────────────────────────────────────
-- 5. RPC: send_friend_request(target_username TEXT) → UUID
-- - Resolves username → id (case-insensitive)
-- - Silently 404s if either side blocks (preserves silencioso)
-- - Rejects: self / already friends / pending request exists
-- - Inserts request + notification for receiver in one tx
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.send_friend_request(target_username TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_self_id        UUID := auth.uid();
  v_target_id      UUID;
  v_self_username  TEXT;
  v_request_id     UUID;
BEGIN
  IF v_self_id IS NULL THEN
    RAISE EXCEPTION 'unauthenticated' USING ERRCODE = 'P0001';
  END IF;

  SELECT id INTO v_target_id
  FROM public.profiles
  WHERE LOWER(username) = LOWER(target_username);

  IF v_target_id IS NULL THEN
    RAISE EXCEPTION 'not_found' USING ERRCODE = 'P0001';
  END IF;
  IF v_target_id = v_self_id THEN
    RAISE EXCEPTION 'self' USING ERRCODE = 'P0001';
  END IF;

  -- Bidirectional block check → silently fail as not_found
  IF EXISTS (
    SELECT 1 FROM public.blocks
    WHERE (blocker_id = v_self_id AND blocked_id = v_target_id)
       OR (blocker_id = v_target_id AND blocked_id = v_self_id)
  ) THEN
    RAISE EXCEPTION 'not_found' USING ERRCODE = 'P0001';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.friendships
    WHERE user_a_id = LEAST(v_self_id, v_target_id)
      AND user_b_id = GREATEST(v_self_id, v_target_id)
  ) THEN
    RAISE EXCEPTION 'already_friends' USING ERRCODE = 'P0001';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.friend_requests
    WHERE status = 'pending'
      AND ((sender_id = v_self_id AND receiver_id = v_target_id)
        OR (sender_id = v_target_id AND receiver_id = v_self_id))
  ) THEN
    RAISE EXCEPTION 'pending_exists' USING ERRCODE = 'P0001';
  END IF;

  SELECT username INTO v_self_username FROM public.profiles WHERE id = v_self_id;

  INSERT INTO public.friend_requests (sender_id, receiver_id)
  VALUES (v_self_id, v_target_id)
  RETURNING id INTO v_request_id;

  INSERT INTO public.notifications (user_id, type, title, message, data)
  VALUES (
    v_target_id,
    'info',
    'Nueva solicitud de amistad',
    '@' || COALESCE(v_self_username, 'alguien') || ' quiere agregarte como amigo.',
    jsonb_build_object(
      'type', 'friend_request_received',
      'request_id', v_request_id,
      'sender_id', v_self_id,
      'sender_username', v_self_username
    )
  );

  RETURN v_request_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.send_friend_request(TEXT) TO authenticated;

-- ────────────────────────────────────────────────────────────
-- 6. RPC: accept_friend_request(request_id UUID) → void
-- - Validates receiver = auth.uid() and status = pending
-- - In one tx: UPDATE request → accepted + INSERT friendship in canonical order
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.accept_friend_request(request_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sender   UUID;
  v_receiver UUID;
  v_status   TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'unauthenticated' USING ERRCODE = 'P0001';
  END IF;

  SELECT sender_id, receiver_id, status
    INTO v_sender, v_receiver, v_status
  FROM public.friend_requests
  WHERE id = request_id
  FOR UPDATE;

  IF v_receiver IS NULL THEN
    RAISE EXCEPTION 'not_found' USING ERRCODE = 'P0001';
  END IF;
  IF v_receiver <> auth.uid() THEN
    RAISE EXCEPTION 'not_receiver' USING ERRCODE = 'P0001';
  END IF;
  IF v_status <> 'pending' THEN
    RAISE EXCEPTION 'not_pending' USING ERRCODE = 'P0001';
  END IF;

  UPDATE public.friend_requests
  SET status = 'accepted', updated_at = NOW()
  WHERE id = request_id;

  INSERT INTO public.friendships (user_a_id, user_b_id)
  VALUES (LEAST(v_sender, v_receiver), GREATEST(v_sender, v_receiver))
  ON CONFLICT DO NOTHING;
END;
$$;

GRANT EXECUTE ON FUNCTION public.accept_friend_request(UUID) TO authenticated;

-- ────────────────────────────────────────────────────────────
-- 7. RPC: block_user(target_id UUID) → void
-- - Inserts block (idempotent)
-- - Cancels pending requests in either direction
-- - Removes friendship if it exists
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.block_user(target_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_self_id UUID := auth.uid();
BEGIN
  IF v_self_id IS NULL OR v_self_id = target_id THEN
    RAISE EXCEPTION 'invalid' USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO public.blocks (blocker_id, blocked_id)
  VALUES (v_self_id, target_id)
  ON CONFLICT DO NOTHING;

  UPDATE public.friend_requests
  SET status = 'cancelled', updated_at = NOW()
  WHERE status = 'pending'
    AND ((sender_id = v_self_id AND receiver_id = target_id)
      OR (sender_id = target_id AND receiver_id = v_self_id));

  DELETE FROM public.friendships
  WHERE user_a_id = LEAST(v_self_id, target_id)
    AND user_b_id = GREATEST(v_self_id, target_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.block_user(UUID) TO authenticated;
