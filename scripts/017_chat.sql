-- ============================================================
-- Migration 017: Chat text-only (Fase 4 — social feature)
-- ------------------------------------------------------------
-- Tables:  conversations (1:1, canonical order), messages
-- View:    conversation_summaries (per-viewer unread + last message)
-- RPCs:    ensure_conversation, send_message, delete_message,
--          mark_conversation_read, get_unread_message_count
-- Trigger: bump_conversation_last_message
-- Realtime publication: messages (NOT conversations — avoids the
--   re-render storm described in section 13.10 of the plan; the
--   inbox uses SWR polling for last_message_at instead).
--
-- Idempotent: safe to re-run.
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. conversations
-- Canonical order (user_a_id < user_b_id) so (A,B) and (B,A)
-- resolve to the same row. Unique per pair enforced.
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.conversations (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_a_id             UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  user_b_id             UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  last_message_at       TIMESTAMPTZ,
  user_a_last_read_at   TIMESTAMPTZ,
  user_b_last_read_at   TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT conversations_canonical_order CHECK (user_a_id < user_b_id),
  CONSTRAINT conversations_unique_pair    UNIQUE (user_a_id, user_b_id)
);

CREATE INDEX IF NOT EXISTS conversations_user_a_last_msg_idx
  ON public.conversations (user_a_id, last_message_at DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS conversations_user_b_last_msg_idx
  ON public.conversations (user_b_id, last_message_at DESC NULLS LAST);

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='conversations' AND policyname='conversations_select') THEN
    CREATE POLICY "conversations_select" ON public.conversations
      FOR SELECT USING (auth.uid() = user_a_id OR auth.uid() = user_b_id);
  END IF;
  -- UPDATE: necesario para mark_conversation_read desde el cliente.
  -- Enforced por RPC pero la policy se mantiene defensiva.
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='conversations' AND policyname='conversations_update_read') THEN
    CREATE POLICY "conversations_update_read" ON public.conversations
      FOR UPDATE USING (auth.uid() = user_a_id OR auth.uid() = user_b_id);
  END IF;
  -- NO insert policy: ensure_conversation (SECURITY DEFINER) es el único camino.
END $$;

-- ────────────────────────────────────────────────────────────
-- 2. messages
-- body ≤ 4000 chars. edited_at reservado para v2.1 (NULL).
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.messages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id       UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  body            TEXT NOT NULL CHECK (char_length(body) > 0 AND char_length(body) <= 4000),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at      TIMESTAMPTZ,
  edited_at       TIMESTAMPTZ
);

COMMENT ON COLUMN public.messages.edited_at IS
  'Reserved for v2.1 message editing. NULL until then.';

CREATE INDEX IF NOT EXISTS messages_conversation_created_idx
  ON public.messages (conversation_id, created_at DESC);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='messages' AND policyname='messages_select') THEN
    CREATE POLICY "messages_select" ON public.messages
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM public.conversations c
          WHERE c.id = messages.conversation_id
            AND (auth.uid() = c.user_a_id OR auth.uid() = c.user_b_id)
        )
      );
  END IF;
  -- NO insert policy: send_message RPC (SECURITY DEFINER) valida amistad+bloqueo+rate-limit.
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='messages' AND policyname='messages_soft_delete_own') THEN
    CREATE POLICY "messages_soft_delete_own" ON public.messages
      FOR UPDATE USING (auth.uid() = sender_id);
  END IF;
END $$;

-- ────────────────────────────────────────────────────────────
-- 3. Trigger: bump conversations.last_message_at on INSERT
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.bump_conversation_last_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.conversations
  SET last_message_at = NEW.created_at
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS messages_bump_conversation ON public.messages;
CREATE TRIGGER messages_bump_conversation
  AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.bump_conversation_last_message();

-- ────────────────────────────────────────────────────────────
-- 4. conversation_summaries — vista con unread por viewer.
-- security_invoker: filtra por auth.uid() del caller.
--
-- If this gets slow (100+ conversations per user), migrate to a
-- conversation_reads table with unread_count maintained by trigger
-- on INSERT/UPDATE messages. For MVP with <100 conversations per
-- user, the subquery-per-row cost is trivial.
-- ────────────────────────────────────────────────────────────
DROP VIEW IF EXISTS public.conversation_summaries;
CREATE VIEW public.conversation_summaries
WITH (security_invoker = true)
AS
SELECT
  c.id,
  c.user_a_id,
  c.user_b_id,
  c.last_message_at,
  c.created_at,
  CASE WHEN c.user_a_id = auth.uid() THEN c.user_b_id ELSE c.user_a_id END AS peer_id,
  CASE WHEN c.user_a_id = auth.uid() THEN c.user_a_last_read_at
       ELSE c.user_b_last_read_at END AS my_last_read_at,
  (
    SELECT COUNT(*)::INTEGER
    FROM public.messages m
    WHERE m.conversation_id = c.id
      AND m.sender_id <> auth.uid()
      AND m.deleted_at IS NULL
      AND m.created_at > COALESCE(
        CASE WHEN c.user_a_id = auth.uid() THEN c.user_a_last_read_at ELSE c.user_b_last_read_at END,
        '1970-01-01'::TIMESTAMPTZ
      )
  ) AS unread_count,
  (
    SELECT jsonb_build_object(
      'id',         m.id,
      'sender_id',  m.sender_id,
      'body',       CASE WHEN m.deleted_at IS NULL THEN m.body ELSE NULL END,
      'created_at', m.created_at,
      'deleted_at', m.deleted_at
    )
    FROM public.messages m
    WHERE m.conversation_id = c.id
    ORDER BY m.created_at DESC
    LIMIT 1
  ) AS last_message
FROM public.conversations c
WHERE c.user_a_id = auth.uid() OR c.user_b_id = auth.uid();

REVOKE ALL ON public.conversation_summaries FROM PUBLIC;
REVOKE ALL ON public.conversation_summaries FROM anon;
GRANT SELECT ON public.conversation_summaries TO authenticated;

-- ────────────────────────────────────────────────────────────
-- 5. RPC: ensure_conversation(peer_id UUID) → UUID
-- Crea la conversation en orden canónico si son amigos y no existe.
-- Para ex-amigos con conversation previa, devuelve la existente
-- (el caller decide si habilita el input según friendship actual).
-- Bloqueo bidireccional → silent not_found.
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.ensure_conversation(peer_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_self UUID := auth.uid();
  v_a UUID;
  v_b UUID;
  v_id UUID;
BEGIN
  IF v_self IS NULL THEN RAISE EXCEPTION 'unauthenticated' USING ERRCODE='P0001'; END IF;
  IF v_self = peer_id THEN RAISE EXCEPTION 'self' USING ERRCODE='P0001'; END IF;

  IF EXISTS (
    SELECT 1 FROM public.blocks
    WHERE (blocker_id = v_self AND blocked_id = peer_id)
       OR (blocker_id = peer_id AND blocked_id = v_self)
  ) THEN
    -- Bloqueo bidireccional: NO colapsamos a not_found acá porque el caller
    -- necesita distinguir blocked_by_me (render read-only banner) vs
    -- blocked_by_them (404 silencioso). getRelationshipState hace ese trabajo
    -- antes, y en ese punto blocked_by_them ya disparó notFound(). Si llegamos
    -- acá con blocked_by_me, igual devolvemos la conversation existente (si
    -- la hay) para que el banner pueda renderizar.
    SELECT id INTO v_id FROM public.conversations
    WHERE user_a_id = LEAST(v_self, peer_id)
      AND user_b_id = GREATEST(v_self, peer_id);
    IF v_id IS NOT NULL THEN
      RETURN v_id;
    END IF;
    RAISE EXCEPTION 'not_found' USING ERRCODE='P0001';
  END IF;

  v_a := LEAST(v_self, peer_id);
  v_b := GREATEST(v_self, peer_id);

  -- Amistad actual requerida para CREAR. Ex-amigos con conversation previa
  -- se devuelven como read-only.
  IF NOT EXISTS (
    SELECT 1 FROM public.friendships
    WHERE user_a_id = v_a AND user_b_id = v_b
  ) THEN
    SELECT id INTO v_id FROM public.conversations
    WHERE user_a_id = v_a AND user_b_id = v_b;
    IF v_id IS NOT NULL THEN
      RETURN v_id;
    END IF;
    RAISE EXCEPTION 'not_friends' USING ERRCODE='P0001';
  END IF;

  INSERT INTO public.conversations (user_a_id, user_b_id)
  VALUES (v_a, v_b)
  ON CONFLICT (user_a_id, user_b_id) DO NOTHING
  RETURNING id INTO v_id;

  IF v_id IS NULL THEN
    SELECT id INTO v_id FROM public.conversations
    WHERE user_a_id = v_a AND user_b_id = v_b;
  END IF;

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.ensure_conversation(UUID) TO authenticated;

-- ────────────────────────────────────────────────────────────
-- 6. RPC: send_message(conversation_id UUID, body TEXT) → UUID
-- Rate limit 10 msg/min PER CONVERSATION (no global — ver Ajuste A
-- del reporte: un user con múltiples chats activos no se penaliza).
-- Cuenta vivos + deleted_at (borrar no reinicia el contador).
-- Valida amistad actual + no-bloqueo + parte-de-la-conv.
-- ────────────────────────────────────────────────────────────
-- Parameters use p_ prefix to avoid collision with target table columns
-- (`messages.conversation_id`, `messages.body`) inside INSERT/WHERE scopes.
-- Bare `conversation_id` or `body` produced PG 42702 ambiguous-reference
-- errors on some versions; p_ prefix eliminates the ambiguity at the source.
-- Note: renaming parameters requires DROP + CREATE (CREATE OR REPLACE cannot
-- change param names). In this file we keep CREATE OR REPLACE for idempotency;
-- in prod run DROP FUNCTION once if the old signature is cached.
CREATE OR REPLACE FUNCTION public.send_message(p_conversation_id UUID, p_body TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_self UUID := auth.uid();
  v_peer UUID;
  v_msg_id UUID;
  v_count INT;
BEGIN
  IF v_self IS NULL THEN RAISE EXCEPTION 'unauthenticated' USING ERRCODE='P0001'; END IF;
  IF p_body IS NULL OR char_length(trim(p_body)) = 0 THEN
    RAISE EXCEPTION 'empty' USING ERRCODE='P0001';
  END IF;
  IF char_length(p_body) > 4000 THEN
    RAISE EXCEPTION 'too_long' USING ERRCODE='P0001';
  END IF;

  SELECT CASE WHEN user_a_id = v_self THEN user_b_id
              WHEN user_b_id = v_self THEN user_a_id
              ELSE NULL END
    INTO v_peer
  FROM public.conversations WHERE id = p_conversation_id;

  IF v_peer IS NULL THEN RAISE EXCEPTION 'not_found' USING ERRCODE='P0001'; END IF;

  -- Bloqueo bidireccional → silent not_found
  IF EXISTS (
    SELECT 1 FROM public.blocks
    WHERE (blocker_id = v_self AND blocked_id = v_peer)
       OR (blocker_id = v_peer AND blocked_id = v_self)
  ) THEN
    RAISE EXCEPTION 'not_found' USING ERRCODE='P0001';
  END IF;

  -- Amistad actual requerida para ENVIAR (ex-amigos = read-only)
  IF NOT EXISTS (
    SELECT 1 FROM public.friendships
    WHERE user_a_id = LEAST(v_self, v_peer)
      AND user_b_id = GREATEST(v_self, v_peer)
  ) THEN
    RAISE EXCEPTION 'not_friends' USING ERRCODE='P0001';
  END IF;

  -- Rate limit PER CONVERSATION: 10 msg/min.
  -- Incluye soft-deleted — borrar no reinicia el contador.
  SELECT COUNT(*) INTO v_count
  FROM public.messages
  WHERE sender_id = v_self
    AND conversation_id = p_conversation_id
    AND created_at > NOW() - INTERVAL '1 minute';

  IF v_count >= 10 THEN
    RAISE EXCEPTION 'rate_limited' USING ERRCODE='P0001';
  END IF;

  INSERT INTO public.messages (conversation_id, sender_id, body)
  VALUES (p_conversation_id, v_self, p_body)
  RETURNING id INTO v_msg_id;

  RETURN v_msg_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.send_message(UUID, TEXT) TO authenticated;

-- ────────────────────────────────────────────────────────────
-- 7. RPC: delete_message(message_id UUID) → void
-- Soft delete del mensaje propio. Idempotente.
-- Mantenemos el body en DB pero la view y el client lo colapsan a null.
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.delete_message(message_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_self UUID := auth.uid();
BEGIN
  IF v_self IS NULL THEN RAISE EXCEPTION 'unauthenticated' USING ERRCODE='P0001'; END IF;

  UPDATE public.messages
  SET deleted_at = COALESCE(deleted_at, NOW())
  WHERE id = message_id AND sender_id = v_self;
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_message(UUID) TO authenticated;

-- ────────────────────────────────────────────────────────────
-- 8. RPC: mark_conversation_read(p_conversation_id UUID) → void
-- ------------------------------------------------------------
-- Parameter uses p_ prefix to avoid the PG 42702 ambiguous column
-- reference bug (same class as send_message). Superseded by the
-- extended definition in migration 018 (which also bumps messages.
-- read_at); this source remains for historical consistency but the
-- deployed function is the 018 version.
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.mark_conversation_read(p_conversation_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_self UUID := auth.uid();
BEGIN
  IF v_self IS NULL THEN RAISE EXCEPTION 'unauthenticated' USING ERRCODE='P0001'; END IF;

  UPDATE public.conversations
  SET user_a_last_read_at = NOW()
  WHERE id = p_conversation_id AND user_a_id = v_self;

  UPDATE public.conversations
  SET user_b_last_read_at = NOW()
  WHERE id = p_conversation_id AND user_b_id = v_self;
END;
$$;

GRANT EXECUTE ON FUNCTION public.mark_conversation_read(UUID) TO authenticated;

-- ────────────────────────────────────────────────────────────
-- 9. RPC: get_unread_message_count() → INTEGER
-- Barato: 1 sola fila. Llamada cada 30s desde el topbar.
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_unread_message_count()
RETURNS INTEGER
LANGUAGE sql
SECURITY INVOKER
STABLE
AS $$
  SELECT COALESCE(SUM(unread_count), 0)::INTEGER FROM public.conversation_summaries;
$$;

GRANT EXECUTE ON FUNCTION public.get_unread_message_count() TO authenticated;

-- ────────────────────────────────────────────────────────────
-- 10. Realtime: publicación para messages (solo).
-- conversations NO se publica: last_message_at se refresca vía SWR
-- en el inbox para evitar el re-render storm descrito en 13.10.
-- ────────────────────────────────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
  END IF;
END $$;

-- ────────────────────────────────────────────────────────────
-- 11. Cross-user profile SELECT policy.
-- ------------------------------------------------------------
-- The `profiles` table inherits an RLS policy from migration 001 that only
-- permits `auth.uid() = id` — each user can only read their OWN row. Views
-- like `friends_visible_profiles` and `profiles_public` declare
-- `security_invoker = true`, so RLS is evaluated against the caller. Without
-- a broader SELECT policy, those views return ZERO rows for any cross-user
-- lookup — silently. No error surfaces; the caller just gets null.
--
-- This manifested as Fase 4's `/chat/[userId]` 404ing intermittently: the
-- `friends_visible_profiles` / `profiles_public` reads returned null even for
-- confirmed friends, making the page fall into the non-friends branch and
-- eventually notFound().
--
-- The policy below is ADDITIVE — Postgres ORs all permissive SELECT policies
-- together. The existing `auth.uid() = id` policy keeps working; this one
-- widens access to: discoverable profiles (anyone who chose to be findable)
-- OR profiles you're already friends with. Never exposes non-discoverable
-- non-friend profiles.
--
-- GOTCHA for future features: any view with security_invoker=true that reads
-- `profiles` needs to make sure this policy covers the use case. If a new
-- feature requires reading profiles for non-friends non-discoverable users,
-- either extend this policy OR run that read through `createAdminClient()`
-- server-side (the pattern already used for blocked/ex-friends lookup in
-- /chat, /chat/[userId] and /friends).
-- ────────────────────────────────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'profiles' AND policyname = 'profiles_select_discoverable_or_friends'
  ) THEN
    CREATE POLICY "profiles_select_discoverable_or_friends" ON public.profiles
      FOR SELECT USING (
        auth.uid() = id
        OR is_discoverable = TRUE
        OR EXISTS (
          SELECT 1 FROM public.friendships
          WHERE user_a_id = LEAST(auth.uid(), profiles.id)
            AND user_b_id = GREATEST(auth.uid(), profiles.id)
        )
      );
  END IF;
END $$;
