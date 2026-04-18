-- 018_chat_presence.sql
-- Fase 5 — Chat real-time UX: read receipts + derived presence.
--
-- Resumen:
--   1. messages.read_at            — read receipts granulares (✓ vs ✓✓).
--   2. profiles.last_seen_at       — heartbeat para presence derivada en listas.
--   3. touch_last_seen()           — RPC heartbeat, cliente llama cada 60s.
--   4. mark_conversation_read()    — extendida: además de bump last_read_at por
--                                    user en conversations, batch-update
--                                    messages.read_at para los mensajes del peer.
--
-- Notas de privacidad:
--   last_seen_at queda visible bajo la policy profiles_select_discoverable_or_friends
--   (migración 017 bloque 11), o sea: amigos + discoverable. No hay toggle
--   show_online en Fase 5 — el threshold de 90s mitiga la granularidad. Ver
--   gotcha 13.12 del plan.
--
-- Idempotente: corre múltiples veces sin romper.

BEGIN;

-- ──────────────────────────────────────────────────────────────────────────
-- 1. messages.read_at
-- ──────────────────────────────────────────────────────────────────────────
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ;

-- Índice parcial para el UPDATE batch del mark_conversation_read.
-- Cubre el predicate (sender_id != viewer AND read_at IS NULL AND deleted_at IS NULL)
-- acotado por conversation_id. Los rows leídos / borrados no entran al índice.
CREATE INDEX IF NOT EXISTS messages_unread_by_recipient_idx
  ON public.messages (conversation_id, sender_id)
  WHERE read_at IS NULL AND deleted_at IS NULL;

-- ──────────────────────────────────────────────────────────────────────────
-- 2. profiles.last_seen_at
-- ──────────────────────────────────────────────────────────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ;

-- ──────────────────────────────────────────────────────────────────────────
-- 2b. Recreate friends_visible_profiles view con last_seen_at.
--
-- NOTA: profiles_public (granted a anon) se deja SIN last_seen_at a propósito —
-- no queremos que users no autenticados scrapeen el estado online de
-- discoverables. El derivado online/offline solo se expone a authenticated
-- via friends_visible_profiles o via queries directas a profiles (permitidas
-- por policy 017 bloque 11 para amigos/discoverables del viewer).
-- ──────────────────────────────────────────────────────────────────────────
DROP VIEW IF EXISTS public.friends_visible_profiles;
CREATE VIEW public.friends_visible_profiles
WITH (security_invoker = true)
AS
SELECT
  p.id, p.username, p.nickname, p.avatar_url, p.bio,
  p.is_discoverable, p.last_seen_at, p.created_at
FROM public.profiles p
WHERE auth.uid() IS NOT NULL
  AND p.id <> auth.uid()
  AND NOT EXISTS (
    SELECT 1 FROM public.blocks b
    WHERE (b.blocker_id = auth.uid() AND b.blocked_id = p.id)
       OR (b.blocker_id = p.id        AND b.blocked_id = auth.uid())
  );

REVOKE ALL ON public.friends_visible_profiles FROM PUBLIC;
REVOKE ALL ON public.friends_visible_profiles FROM anon;
GRANT SELECT ON public.friends_visible_profiles TO authenticated;

-- ──────────────────────────────────────────────────────────────────────────
-- 3. RPC touch_last_seen — heartbeat self-update
-- ──────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.touch_last_seen()
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.profiles SET last_seen_at = NOW() WHERE id = auth.uid();
$$;

GRANT EXECUTE ON FUNCTION public.touch_last_seen() TO authenticated;

-- ──────────────────────────────────────────────────────────────────────────
-- 4. RPC mark_conversation_read — EXTENDIDA
--    Misma firma que 017, suma el batch de messages.read_at en la misma TX.
-- ──────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.mark_conversation_read(conversation_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Bump last_read_at del viewer en conversations (comportamiento Fase 4).
  UPDATE public.conversations
  SET user_a_last_read_at = NOW()
  WHERE id = mark_conversation_read.conversation_id
    AND user_a_id = auth.uid();

  UPDATE public.conversations
  SET user_b_last_read_at = NOW()
  WHERE id = mark_conversation_read.conversation_id
    AND user_b_id = auth.uid();

  -- Fase 5: marcar todos los mensajes del peer como leídos en este momento.
  -- Scope acotado por sender_id != viewer — el viewer nunca marca sus propios
  -- mensajes como leídos por sí mismo. deleted_at IS NULL para no tocar
  -- mensajes borrados.
  UPDATE public.messages
  SET read_at = NOW()
  WHERE conversation_id = mark_conversation_read.conversation_id
    AND sender_id != auth.uid()
    AND read_at IS NULL
    AND deleted_at IS NULL;
END;
$$;

GRANT EXECUTE ON FUNCTION public.mark_conversation_read(UUID) TO authenticated;

COMMIT;
