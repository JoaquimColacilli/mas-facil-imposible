-- ============================================================
-- MFI · Migration 029: Goals — liquidation flow + drop legacy columns (PR 2/3)
-- ============================================================
-- Aplicar DESPUÉS de 028 y DESPUÉS de que PR 2 esté en staging y la UI
-- vieja no lea más `icon`/`color`. PR 2 ya borra las lecturas.
--
-- Idempotente.
-- ============================================================

-- ------------------------------------------------------------
-- GOALS — extender status para 'liquidated'
-- ------------------------------------------------------------
-- 'liquidated' = meta cumplida cuyo monto se transfirió a una cuenta del
-- usuario. La meta queda en histórico (sigue visible en una sección aparte
-- de la UI), pero no en la lista activa.
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'goals_status_check'
  ) THEN
    ALTER TABLE public.goals DROP CONSTRAINT goals_status_check;
  END IF;
  ALTER TABLE public.goals
    ADD CONSTRAINT goals_status_check
    CHECK (status IN ('active', 'completed', 'paused', 'liquidated'));
END $$;

-- ------------------------------------------------------------
-- GOALS — columnas de liquidación
-- ------------------------------------------------------------
ALTER TABLE public.goals
  ADD COLUMN IF NOT EXISTS liquidated_at TIMESTAMPTZ;

-- Apunta al movimiento de income generado al liquidar — para auditoría.
-- ON DELETE SET NULL: si el usuario borra ese movimiento por accidente,
-- la meta queda con liquidated_at pero sin link (no se puede deshacer
-- la liquidación borrando la meta — eso es feature, no bug).
ALTER TABLE public.goals
  ADD COLUMN IF NOT EXISTS liquidation_transaction_id UUID
  REFERENCES public.transactions(id) ON DELETE SET NULL;

-- ------------------------------------------------------------
-- GOALS — drop legacy columns (icon, color)
-- ------------------------------------------------------------
-- Reemplazadas por el mapa estático de categorías en cliente
-- (lib/goals.ts → CATEGORY_META). PR 2 ya removió todas las lecturas.
ALTER TABLE public.goals DROP COLUMN IF EXISTS icon;
ALTER TABLE public.goals DROP COLUMN IF EXISTS color;
