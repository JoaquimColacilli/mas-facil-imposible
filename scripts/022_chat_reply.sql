-- 022_chat_reply.sql
-- Fase 8 — Chat: reply to a message (WhatsApp-style quote).
--
-- Resumen:
--   1. messages.reply_to_message_id — self-FK opcional. ON DELETE SET NULL
--      para que hard-deletes del mensaje original dejen el reply huérfano
--      (se renderiza como "Mensaje eliminado" en el quote) en vez de
--      romper la conversación con CASCADE.
--   2. Índice parcial messages_reply_to_idx para resolver quickly cuando
--      un mensaje tiene respuestas (no usado todavía, pero barato y útil
--      para features futuros tipo "X respuestas" o thread view).
--   3. send_message RPC extendida con p_reply_to_message_id UUID DEFAULT NULL.
--      Cambio de firma → DROP + CREATE (CREATE OR REPLACE no puede cambiar
--      parámetros). Valida que el reply target (si se pasa) pertenezca a la
--      misma conversation — sino error invalid_reply_target.
--
-- Idempotente: corre múltiples veces sin romper.
-- Nota deploy: si la firma vieja (2 args) quedó cacheada en prod, esta
-- migración la elimina con el DROP antes del CREATE.

BEGIN;

-- ──────────────────────────────────────────────────────────────────────────
-- 1. messages.reply_to_message_id
-- ──────────────────────────────────────────────────────────────────────────
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS reply_to_message_id UUID
    REFERENCES public.messages(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS messages_reply_to_idx
  ON public.messages (reply_to_message_id)
  WHERE reply_to_message_id IS NOT NULL;

-- ──────────────────────────────────────────────────────────────────────────
-- 2. RPC send_message — EXTENDIDA con 3er param opcional p_reply_to_message_id.
--    Cambio de firma → DROP las variantes previas antes del CREATE. Dropea
--    explícitamente la firma (UUID, TEXT) de Fase 4/7 y, por las dudas, la
--    nueva firma (UUID, TEXT, UUID) para permitir re-deploy sin errores.
-- ──────────────────────────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS public.send_message(UUID, TEXT);
DROP FUNCTION IF EXISTS public.send_message(UUID, TEXT, UUID);

CREATE FUNCTION public.send_message(
  p_conversation_id      UUID,
  p_body                 TEXT,
  p_reply_to_message_id  UUID DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_self UUID := auth.uid();
  v_peer UUID;
  v_msg_id UUID;
  v_count INT;
  v_reply_conv UUID;
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

  -- Amistad actual requerida para ENVIAR
  IF NOT EXISTS (
    SELECT 1 FROM public.friendships
    WHERE user_a_id = LEAST(v_self, v_peer)
      AND user_b_id = GREATEST(v_self, v_peer)
  ) THEN
    RAISE EXCEPTION 'not_friends' USING ERRCODE='P0001';
  END IF;

  -- Rate limit PER CONVERSATION: 10 msg/min (incluye soft-deleted).
  SELECT COUNT(*) INTO v_count
  FROM public.messages
  WHERE sender_id = v_self
    AND conversation_id = p_conversation_id
    AND created_at > NOW() - INTERVAL '1 minute';

  IF v_count >= 10 THEN
    RAISE EXCEPTION 'rate_limited' USING ERRCODE='P0001';
  END IF;

  -- Reply target debe existir, pertenecer a la misma conversation, y NO estar
  -- soft-deleted. El client también bloquea reply a un mensaje eliminado, pero
  -- validamos server-side en profundidad contra clients alternativos / bugs.
  -- Los mensajes hard-deleted caen por FK ON DELETE SET NULL → no llegan acá.
  IF p_reply_to_message_id IS NOT NULL THEN
    SELECT conversation_id INTO v_reply_conv
      FROM public.messages
     WHERE id = p_reply_to_message_id
       AND deleted_at IS NULL;

    IF v_reply_conv IS NULL OR v_reply_conv <> p_conversation_id THEN
      RAISE EXCEPTION 'invalid_reply_target' USING ERRCODE='P0001';
    END IF;
  END IF;

  INSERT INTO public.messages (conversation_id, sender_id, body, reply_to_message_id)
  VALUES (p_conversation_id, v_self, p_body, p_reply_to_message_id)
  RETURNING id INTO v_msg_id;

  RETURN v_msg_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.send_message(UUID, TEXT, UUID) TO authenticated;

COMMIT;
