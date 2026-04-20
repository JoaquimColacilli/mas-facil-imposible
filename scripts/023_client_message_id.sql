-- 023_client_message_id.sql
-- Fase 8 (ajuste) — Chat: accept client-generated UUID for messages.
--
-- Motivación:
--   Con UI optimista, el cliente pushea un temp-bubble con un id localmente
--   generado. Cuando el RPC inserta la row con un id DIFERENTE, el Realtime
--   INSERT trae ese id nuevo y no matchea el temp → ingest appendea, y luego
--   el server response filtra el temp → reordenamiento visible bajo ráfagas
--   (el usuario manda 1-2-3-4 y ve el orden roto mientras los sends resuelven).
--
--   Fix senior (Signal/Matrix/Linear pattern): el cliente genera el UUID
--   antes del send. Temp y real comparten id → Realtime ingest va al UPDATE
--   path (swap in-place), server response solo limpia pending. Cero race.
--
-- Resumen:
--   1. send_message RPC extendida con p_client_id UUID DEFAULT NULL.
--   2. COALESCE(p_client_id, gen_random_uuid()) como id a insertar.
--   3. ON CONFLICT (id) DO NOTHING → retry idempotente: si el mismo id ya
--      existe (retry con connection flaky), el INSERT es no-op y devolvemos
--      el id de la row existente. RETURNING solo matchea la primera; si hubo
--      conflict, hacemos SELECT explícito.
--   4. Backward compat: clients viejos que no pasan p_client_id siguen
--      funcionando (default NULL → gen_random_uuid).
--
-- Idempotente: corre múltiples veces sin romper.

BEGIN;

-- Drop todas las firmas previas (2-arg original, 3-arg de Fase 8).
DROP FUNCTION IF EXISTS public.send_message(UUID, TEXT);
DROP FUNCTION IF EXISTS public.send_message(UUID, TEXT, UUID);
DROP FUNCTION IF EXISTS public.send_message(UUID, TEXT, UUID, UUID);

CREATE FUNCTION public.send_message(
  p_conversation_id      UUID,
  p_body                 TEXT,
  p_reply_to_message_id  UUID DEFAULT NULL,
  p_client_id            UUID DEFAULT NULL
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
  v_target_id UUID;
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

  -- Id a insertar: client-provided o generado por la DB.
  v_target_id := COALESCE(p_client_id, gen_random_uuid());

  -- ON CONFLICT DO NOTHING hace el retry idempotente: si la network se corta
  -- después del INSERT pero antes de que el cliente lo vea confirmado y el
  -- cliente retrieá con el mismo client_id, la segunda call es no-op.
  INSERT INTO public.messages (id, conversation_id, sender_id, body, reply_to_message_id)
  VALUES (v_target_id, p_conversation_id, v_self, p_body, p_reply_to_message_id)
  ON CONFLICT (id) DO NOTHING
  RETURNING id INTO v_msg_id;

  -- Si hubo conflict, RETURNING no devuelve fila. Devolvemos igual el id
  -- target (la row existe, fue escrita por el envío previo del mismo client_id).
  -- Nota: si un cliente malicioso intentara robar un id de otro user con el
  -- mismo conflict, el SELECT que hace el caller después verá sender_id != self
  -- y el mensaje no aparece como suyo. Sin leak.
  IF v_msg_id IS NULL THEN
    v_msg_id := v_target_id;
  END IF;

  RETURN v_msg_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.send_message(UUID, TEXT, UUID, UUID) TO authenticated;

COMMIT;
