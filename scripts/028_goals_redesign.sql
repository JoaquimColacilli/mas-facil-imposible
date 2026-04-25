-- ============================================================
-- MFI · Migration 028: Goals redesign — schema foundation (PR 1/3)
-- ============================================================
-- Sin breaking changes para la UI actual:
--   · Todos los campos nuevos son nullable o tienen default seguro.
--   · `icon` y `color` quedan en su lugar; PR 3 los elimina.
--   · `status` no agrega 'liquidated' todavía; PR 3 lo añade junto al
--     flow real de liquidación.
--
-- Idempotente: cualquier corrida posterior no duplica columnas, índices,
-- triggers ni policies.
-- ============================================================

-- ------------------------------------------------------------
-- GOALS — columnas nuevas
-- ------------------------------------------------------------

-- Categoría fija (enum por CHECK constraint, no por tipo PG).
-- Default 'otro' para que el backfill de filas viejas sea trivial.
ALTER TABLE public.goals
  ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'otro';

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'goals_category_check'
  ) THEN
    ALTER TABLE public.goals
      ADD CONSTRAINT goals_category_check
      CHECK (category IN ('viaje', 'auto', 'casa', 'emergencia', 'inversion', 'otro'));
  END IF;
END $$;

-- Aporte mensual configurado.
-- Sensible (revela capacidad de ahorro): vive cifrado dentro de enc_data.
-- La columna plaintext queda en 0 — replica el patrón existente para
-- target_amount/current_amount (ver app/(app)/goals/actions.ts).
ALTER TABLE public.goals
  ADD COLUMN IF NOT EXISTS monthly_target NUMERIC(18, 2);

COMMENT ON COLUMN public.goals.monthly_target IS
  'Stored as 0 when the real value lives in enc_data (default behaviour). '
  'Non-zero only if a future codepath explicitly opts out of encryption '
  'for aggregate queries that need the exact amount.';

-- Auto-débito declarativo (PR 4 lo conecta a un cron).
ALTER TABLE public.goals
  ADD COLUMN IF NOT EXISTS auto_enabled BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE public.goals
  ADD COLUMN IF NOT EXISTS auto_amount NUMERIC(18, 2);

COMMENT ON COLUMN public.goals.auto_amount IS
  'Same encryption pattern as monthly_target: 0 plaintext + real value '
  'inside enc_data.';

ALTER TABLE public.goals
  ADD COLUMN IF NOT EXISTS auto_day SMALLINT;

-- 1–28 evita el problema de febrero. PR 4 puede relajar a 1–31 si el cron
-- maneja el último-día-del-mes.
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'goals_auto_day_check'
  ) THEN
    ALTER TABLE public.goals
      ADD CONSTRAINT goals_auto_day_check
      CHECK (auto_day IS NULL OR auto_day BETWEEN 1 AND 28);
  END IF;
END $$;

-- Coherencia auto-débito: si auto_enabled, exigir día y monto > 0.
-- Sin esto, PR 4 (cron) tendría que defenderse contra filas inválidas.
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'goals_auto_consistency_check'
  ) THEN
    ALTER TABLE public.goals
      ADD CONSTRAINT goals_auto_consistency_check
      CHECK (
        auto_enabled = FALSE
        OR (auto_day IS NOT NULL AND auto_amount IS NOT NULL AND auto_amount > 0)
      );
  END IF;
END $$;

-- Montos no-negativos. >= 0 (no > 0) porque la columna plaintext queda en 0
-- por diseño cuando el valor real vive en enc_data — coherente con el
-- comentario de monthly_target/auto_amount arriba.
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'goals_amounts_positive_check'
  ) THEN
    ALTER TABLE public.goals
      ADD CONSTRAINT goals_amounts_positive_check
      CHECK (
        (monthly_target IS NULL OR monthly_target >= 0)
        AND (auto_amount IS NULL OR auto_amount >= 0)
      );
  END IF;
END $$;

-- Nota libre del usuario: vive 100% en enc_data. NO se agrega columna
-- plaintext — sería data muerta y otra superficie para drift.
-- Acceso desde la app: enc_data->>'note' tras decryptRow().

-- Marca de cuándo se completó (UI lo muestra en card cumplida).
ALTER TABLE public.goals
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

-- ------------------------------------------------------------
-- TRANSACTIONS — link a goals + origen del movimiento
-- ------------------------------------------------------------

-- goal_id nullable. ON DELETE SET NULL: si se borra la meta, el movimiento
-- queda en el histórico del usuario sin referencia.
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS goal_id UUID REFERENCES public.goals(id) ON DELETE SET NULL;

-- Etiqueta de origen del movimiento.
-- Valores conocidos por la app (no hay CHECK para no acoplar la DB a strings):
--   'manual'           — usuario creó el movimiento a mano (default)
--   'auto_goal'        — generado por el cron de auto-débito (PR 4)
--   'goal_deposit'     — aportó manualmente desde el flow de la meta
--   'goal_liquidation' — meta cumplida liquidada a una cuenta (PR 3)
-- NOT NULL DEFAULT 'manual' backfillea las transactions viejas con el
-- valor semánticamente correcto (eran movimientos a mano antes de existir
-- el flow de metas) y obliga a la app a setearlo siempre.
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'manual';

-- ------------------------------------------------------------
-- Sobre el `type` de un depósito a meta
-- ------------------------------------------------------------
-- Decisión: NO se agrega 'goal_deposit' al CHECK de transactions.type.
--
-- Un aporte a meta es `type='savings'` + `goal_id IS NOT NULL`. La
-- presencia de goal_id es el discriminador suficiente, y las queries de
-- "Ahorros del mes" en Dashboard (que ya suman `type='savings'`) no se
-- parten silenciosamente cuando el usuario migra al flow de metas. La
-- distinción manual/auto se hace por `source`.
--
-- Ergo: no se modifica `transactions_type_check`.

-- ------------------------------------------------------------
-- TRANSACTIONS — índice parcial para sparkline / feed por meta
-- ------------------------------------------------------------
-- Parcial sobre goal_id IS NOT NULL: la mayoría de las transactions no
-- tienen goal_id, así no inflamos el índice. Soporta:
--   SELECT amount, date FROM transactions
--   WHERE user_id = $1 AND goal_id = $2
--   ORDER BY date DESC;
CREATE INDEX IF NOT EXISTS transactions_goal_idx
  ON public.transactions (user_id, goal_id, date DESC)
  WHERE goal_id IS NOT NULL;

-- ------------------------------------------------------------
-- TRANSACTIONS — trigger de validación de ownership cross-table
-- ------------------------------------------------------------
-- RLS valida que la transaction pertenezca al usuario. Pero no impide que
-- ese usuario inserte un goal_id que pertenezca a OTRO usuario (un atacante
-- con sesión válida intentando aportar a la meta ajena para enturbiar feed
-- de ese otro usuario, o simplemente data corrupta por bug del cliente).
--
-- Este trigger valida que goals.user_id = transactions.user_id cuando
-- goal_id no es null. Es defensa en profundidad — barata, contundente.
CREATE OR REPLACE FUNCTION public.validate_transaction_goal_ownership()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.goal_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.goals
      WHERE id = NEW.goal_id AND user_id = NEW.user_id
    ) THEN
      RAISE EXCEPTION 'goal_id % does not belong to user %', NEW.goal_id, NEW.user_id
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- UPDATE OF goal_id, user_id: el segundo no debería cambiar nunca, pero
-- cubrirlo cuesta cero y blinda contra migrations futuras o bugs.
DROP TRIGGER IF EXISTS transactions_validate_goal_ownership ON public.transactions;
CREATE TRIGGER transactions_validate_goal_ownership
  BEFORE INSERT OR UPDATE OF goal_id, user_id ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.validate_transaction_goal_ownership();

-- ------------------------------------------------------------
-- Notas para PRs siguientes (NO se aplican acá)
-- ------------------------------------------------------------
-- PR 3 (liquidación):
--   ALTER TABLE public.goals DROP CONSTRAINT goals_status_check;
--   ALTER TABLE public.goals ADD CONSTRAINT goals_status_check
--     CHECK (status IN ('active', 'completed', 'paused', 'liquidated'));
--   ALTER TABLE public.goals ADD COLUMN liquidated_at TIMESTAMPTZ;
--   ALTER TABLE public.goals ADD COLUMN liquidation_transaction_id UUID
--     REFERENCES public.transactions(id) ON DELETE SET NULL;
--   ALTER TABLE public.goals DROP COLUMN icon;
--   ALTER TABLE public.goals DROP COLUMN color;
--
-- PR 4 (cron auto-débito):
--   ALTER TABLE public.goals ADD COLUMN auto_source_account_id UUID
--     REFERENCES public.portfolios(id) ON DELETE SET NULL;
--   (+ tabla de logs de ejecución)
