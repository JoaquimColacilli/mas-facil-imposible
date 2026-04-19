-- 019_loans_debts_friend.sql
-- Fase 6 — Integración loans/debts ↔ social graph.
--
-- Resumen:
--   1. loans/debts + friend_id + linked_*_id (cross-table FK al contrapartida).
--   2. Índices (partial unique en linked_*_id; partial en friend_id).
--   3. RPC send_linked_loan_request / send_linked_debt_request — crea la notif
--      pending al amigo. Validan ownership, amistad activa, no-duplicado por
--      par+dirección.
--
-- NO cifrar friend_id ni linked_*_id — son UUIDs FK, no PII (§5.2 Fase 0).
-- NO agregar CHECK sobre loans/debts — el schema prod ya tiene amount >= 0 y
-- currency IN ('ARS','USD') que cubren la lógica nueva sin friction.
--
-- La encriptación del registro contrapartida ocurre server-side en Next.js
-- (server actions), porque el RPC plpgsql no tiene acceso a ENCRYPTION_KEY.
--
-- Idempotente.

BEGIN;

-- ──────────────────────────────────────────────────────────────────────────
-- 1. Columnas nuevas
-- ──────────────────────────────────────────────────────────────────────────
ALTER TABLE public.loans
  ADD COLUMN IF NOT EXISTS friend_id       UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS linked_debt_id  UUID REFERENCES public.debts(id)    ON DELETE SET NULL;

ALTER TABLE public.debts
  ADD COLUMN IF NOT EXISTS friend_id       UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS linked_loan_id  UUID REFERENCES public.loans(id)    ON DELETE SET NULL;

-- Naming (recordatorio del §11.4):
--   loans.linked_debt_id  → apunta al debt contrapartida en el OTRO lado.
--   debts.linked_loan_id  → apunta al loan contrapartida en el OTRO lado.
-- "El id de la tabla a la que apunto", no "mi propio tipo".

-- ──────────────────────────────────────────────────────────────────────────
-- 2. Índices
-- ──────────────────────────────────────────────────────────────────────────
CREATE UNIQUE INDEX IF NOT EXISTS loans_linked_debt_uniq
  ON public.loans (linked_debt_id) WHERE linked_debt_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS debts_linked_loan_uniq
  ON public.debts (linked_loan_id) WHERE linked_loan_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS loans_friend_id_idx
  ON public.loans (friend_id) WHERE friend_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS debts_friend_id_idx
  ON public.debts (friend_id) WHERE friend_id IS NOT NULL;

-- ──────────────────────────────────────────────────────────────────────────
-- 3. Helper: hay algún request abierto entre (sender, receiver) en la
--    dirección loan?
--
--    "Request abierto" = loan del sender con friend_id=receiver, paid=FALSE,
--    AND (linked_debt_id IS NOT NULL OR notif pending en el receiver).
--    Ver §Ajuste B — un request abierto por par y por dirección a la vez.
-- ──────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public._has_open_loan_request(
  p_sender UUID,
  p_receiver UUID,
  p_exclude_loan UUID
)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.loans l
    WHERE l.user_id = p_sender
      AND l.friend_id = p_receiver
      AND l.paid = FALSE
      AND l.id <> p_exclude_loan
      AND (
        l.linked_debt_id IS NOT NULL
        OR EXISTS (
          SELECT 1 FROM public.notifications n
          WHERE n.user_id = p_receiver
            AND n.data ->> 'type' = 'friend_loan_request'
            AND (n.data ->> 'loan_id')::UUID = l.id
            AND n.read = FALSE
        )
      )
  );
$$;

CREATE OR REPLACE FUNCTION public._has_open_debt_request(
  p_sender UUID,
  p_receiver UUID,
  p_exclude_debt UUID
)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.debts d
    WHERE d.user_id = p_sender
      AND d.friend_id = p_receiver
      AND d.paid = FALSE
      AND d.id <> p_exclude_debt
      AND (
        d.linked_loan_id IS NOT NULL
        OR EXISTS (
          SELECT 1 FROM public.notifications n
          WHERE n.user_id = p_receiver
            AND n.data ->> 'type' = 'friend_debt_request'
            AND (n.data ->> 'debt_id')::UUID = d.id
            AND n.read = FALSE
        )
      )
  );
$$;

-- ──────────────────────────────────────────────────────────────────────────
-- 4. RPC send_linked_loan_request(loan_id UUID) → UUID
--    A dueño del loan pide a friend_id que confirme la deuda contrapartida.
-- ──────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.send_linked_loan_request(loan_id UUID)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_self UUID := auth.uid();
  v_loan RECORD;
  v_self_username TEXT;
BEGIN
  IF v_self IS NULL THEN RAISE EXCEPTION 'unauthenticated' USING ERRCODE = 'P0001'; END IF;

  SELECT id, user_id, friend_id, currency, linked_debt_id, paid
    INTO v_loan FROM public.loans WHERE id = loan_id;
  IF v_loan.id IS NULL       THEN RAISE EXCEPTION 'loan_not_found'      USING ERRCODE = 'P0001'; END IF;
  IF v_loan.user_id <> v_self THEN RAISE EXCEPTION 'not_owner'          USING ERRCODE = 'P0001'; END IF;
  IF v_loan.friend_id IS NULL THEN RAISE EXCEPTION 'no_friend'          USING ERRCODE = 'P0001'; END IF;
  IF v_loan.paid              THEN RAISE EXCEPTION 'already_paid'       USING ERRCODE = 'P0001'; END IF;
  IF v_loan.linked_debt_id IS NOT NULL THEN RAISE EXCEPTION 'already_linked' USING ERRCODE = 'P0001'; END IF;

  -- Amistad activa requerida.
  IF NOT EXISTS (
    SELECT 1 FROM public.friendships
    WHERE user_a_id = LEAST(v_self, v_loan.friend_id)
      AND user_b_id = GREATEST(v_self, v_loan.friend_id)
  ) THEN RAISE EXCEPTION 'not_friends' USING ERRCODE = 'P0001'; END IF;

  -- Anti-duplicado: notif pending por ESTE loan.
  IF EXISTS (
    SELECT 1 FROM public.notifications
    WHERE user_id = v_loan.friend_id
      AND data ->> 'type' = 'friend_loan_request'
      AND (data ->> 'loan_id')::UUID = loan_id
      AND read = FALSE
  ) THEN RAISE EXCEPTION 'request_pending' USING ERRCODE = 'P0001'; END IF;

  -- Ajuste B: un request abierto por par y por dirección. Si ya hay otro
  -- loan del sender al mismo friend abierto (pending o linked-unpaid),
  -- rechazar — que resuelva ese primero.
  IF public._has_open_loan_request(v_self, v_loan.friend_id, loan_id) THEN
    RAISE EXCEPTION 'already_linked_or_pending' USING ERRCODE = 'P0001';
  END IF;

  SELECT username INTO v_self_username FROM public.profiles WHERE id = v_self;

  -- Sin amount/note plaintext en data (se resuelven server-side al aceptar).
  INSERT INTO public.notifications (user_id, type, title, message, data)
  VALUES (
    v_loan.friend_id,
    'info',
    'Solicitud de cobro',
    '@' || COALESCE(v_self_username, 'un amigo') || ' te pide confirmar una deuda.',
    jsonb_build_object(
      'type', 'friend_loan_request',
      'loan_id', loan_id,
      'sender_id', v_self,
      'sender_username', v_self_username,
      'currency', v_loan.currency
    )
  );

  RETURN loan_id;
END; $$;

GRANT EXECUTE ON FUNCTION public.send_linked_loan_request(UUID) TO authenticated;

-- ──────────────────────────────────────────────────────────────────────────
-- 5. RPC send_linked_debt_request(debt_id UUID) → UUID
--    Simétrica: A dueño de un debt pide a friend_id que confirme el loan
--    contrapartida del lado de B.
-- ──────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.send_linked_debt_request(debt_id UUID)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_self UUID := auth.uid();
  v_debt RECORD;
  v_self_username TEXT;
BEGIN
  IF v_self IS NULL THEN RAISE EXCEPTION 'unauthenticated' USING ERRCODE = 'P0001'; END IF;

  SELECT id, user_id, friend_id, currency, linked_loan_id, paid
    INTO v_debt FROM public.debts WHERE id = debt_id;
  IF v_debt.id IS NULL        THEN RAISE EXCEPTION 'debt_not_found'      USING ERRCODE = 'P0001'; END IF;
  IF v_debt.user_id <> v_self THEN RAISE EXCEPTION 'not_owner'           USING ERRCODE = 'P0001'; END IF;
  IF v_debt.friend_id IS NULL THEN RAISE EXCEPTION 'no_friend'           USING ERRCODE = 'P0001'; END IF;
  IF v_debt.paid              THEN RAISE EXCEPTION 'already_paid'        USING ERRCODE = 'P0001'; END IF;
  IF v_debt.linked_loan_id IS NOT NULL THEN RAISE EXCEPTION 'already_linked' USING ERRCODE = 'P0001'; END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.friendships
    WHERE user_a_id = LEAST(v_self, v_debt.friend_id)
      AND user_b_id = GREATEST(v_self, v_debt.friend_id)
  ) THEN RAISE EXCEPTION 'not_friends' USING ERRCODE = 'P0001'; END IF;

  IF EXISTS (
    SELECT 1 FROM public.notifications
    WHERE user_id = v_debt.friend_id
      AND data ->> 'type' = 'friend_debt_request'
      AND (data ->> 'debt_id')::UUID = debt_id
      AND read = FALSE
  ) THEN RAISE EXCEPTION 'request_pending' USING ERRCODE = 'P0001'; END IF;

  IF public._has_open_debt_request(v_self, v_debt.friend_id, debt_id) THEN
    RAISE EXCEPTION 'already_linked_or_pending' USING ERRCODE = 'P0001';
  END IF;

  SELECT username INTO v_self_username FROM public.profiles WHERE id = v_self;

  INSERT INTO public.notifications (user_id, type, title, message, data)
  VALUES (
    v_debt.friend_id,
    'info',
    'Solicitud de confirmación de deuda',
    '@' || COALESCE(v_self_username, 'un amigo') || ' dice que te debe plata y pide confirmación.',
    jsonb_build_object(
      'type', 'friend_debt_request',
      'debt_id', debt_id,
      'sender_id', v_self,
      'sender_username', v_self_username,
      'currency', v_debt.currency
    )
  );

  RETURN debt_id;
END; $$;

GRANT EXECUTE ON FUNCTION public.send_linked_debt_request(UUID) TO authenticated;

COMMIT;
