-- ============================================================
-- MFI · Migration 030: Transfer links — A1 (mismo-currency)
-- ============================================================
-- Modela una "transferencia entre buckets" como un par de transactions
-- linkeadas por `transfer_id`. Cada transaction guarda además su rol
-- ('out' / 'in') para que la lectura no requiera comparar amounts.
--
-- La tabla `transfers` mantiene metadata compartida del par:
--   · id           — UUID, FK target en transactions.transfer_id
--   · user_id      — para RLS
--   · from_kind/   — buckets de origen y destino. Necesarios para
--     to_kind        revertir balance de portfolio/goal al borrar
--                    el par (la tabla transactions no guarda
--                    portfolio_id, así que sin esto no se puede
--                    saber qué portfolio retornar).
--   · from_id/     — UUID del portfolio o goal cuando kind requiere
--     to_id          referencia. NULL para 'general' / 'savings'.
--   · fx_rate      — NULL en A1 (mismo-currency). Reservado para A3 (MEP).
--   · note_enc     — nota libre del usuario, opcional, cifrada
--                    (AES-256-GCM, mismo esquema que enc_data en
--                    transactions/goals/loans/debts).
--   · created_at
--
-- Idempotente: cualquier corrida posterior no duplica columnas, índices
-- ni policies.
-- ============================================================

-- ------------------------------------------------------------
-- TRANSFERS — tabla de metadata compartida
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  fx_rate NUMERIC(18, 6),
  note_enc TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Para tablas creadas en una corrida previa de la migración (sin estas
-- columnas), las sumamos idempotentemente. NOT NULL con DEFAULT 'general'
-- backfillea las filas viejas con un valor inocuo — pero como en este
-- punto del rollout no hay filas, el efecto práctico es el mismo que
-- declararlas NOT NULL desde el principio.
ALTER TABLE public.transfers
  ADD COLUMN IF NOT EXISTS from_kind TEXT NOT NULL DEFAULT 'general';
ALTER TABLE public.transfers
  ADD COLUMN IF NOT EXISTS from_id UUID;
ALTER TABLE public.transfers
  ADD COLUMN IF NOT EXISTS to_kind TEXT NOT NULL DEFAULT 'general';
ALTER TABLE public.transfers
  ADD COLUMN IF NOT EXISTS to_id UUID;

-- Sacamos el DEFAULT — la app va a setear el valor explícito siempre.
-- Lo dejamos solo como recurso para el ALTER inicial.
ALTER TABLE public.transfers ALTER COLUMN from_kind DROP DEFAULT;
ALTER TABLE public.transfers ALTER COLUMN to_kind   DROP DEFAULT;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'transfers_from_kind_check'
  ) THEN
    ALTER TABLE public.transfers
      ADD CONSTRAINT transfers_from_kind_check
      CHECK (from_kind IN ('general', 'savings', 'portfolio', 'goal'));
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'transfers_to_kind_check'
  ) THEN
    ALTER TABLE public.transfers
      ADD CONSTRAINT transfers_to_kind_check
      CHECK (to_kind IN ('general', 'savings', 'portfolio', 'goal'));
  END IF;
END $$;

-- Coherencia: from_id / to_id son obligatorios para 'portfolio' y 'goal',
-- y deben ser NULL para 'general' y 'savings'. Sin esto, la app puede
-- guardar refs huérfanas o, peor, ids fantasma para buckets que no las
-- necesitan.
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'transfers_from_id_consistency_check'
  ) THEN
    ALTER TABLE public.transfers
      ADD CONSTRAINT transfers_from_id_consistency_check
      CHECK (
        (from_kind IN ('portfolio', 'goal') AND from_id IS NOT NULL)
        OR (from_kind IN ('general', 'savings') AND from_id IS NULL)
      );
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'transfers_to_id_consistency_check'
  ) THEN
    ALTER TABLE public.transfers
      ADD CONSTRAINT transfers_to_id_consistency_check
      CHECK (
        (to_kind IN ('portfolio', 'goal') AND to_id IS NOT NULL)
        OR (to_kind IN ('general', 'savings') AND to_id IS NULL)
      );
  END IF;
END $$;

-- No hay FK formal hacia portfolios/goals porque from_id/to_id apuntan a
-- distintas tablas según from_kind/to_kind (no hay polymorphic FK en PG).
-- La validación de existencia + ownership la hace createTransfer en la app.

ALTER TABLE public.transfers ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='transfers' AND policyname='transfers_select_own') THEN
    CREATE POLICY "transfers_select_own" ON public.transfers FOR SELECT USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='transfers' AND policyname='transfers_insert_own') THEN
    CREATE POLICY "transfers_insert_own" ON public.transfers FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='transfers' AND policyname='transfers_update_own') THEN
    CREATE POLICY "transfers_update_own" ON public.transfers FOR UPDATE USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='transfers' AND policyname='transfers_delete_own') THEN
    CREATE POLICY "transfers_delete_own" ON public.transfers FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

-- ------------------------------------------------------------
-- TRANSACTIONS — link al par de transferencia
-- ------------------------------------------------------------
-- transfer_id nullable. ON DELETE SET NULL: si se borra el row de
-- `transfers`, las puntas quedan en el histórico sin link cruzado.
-- El delete del par se orquesta a nivel app (deleteTransaction
-- detecta transfer_id != null y borra contraparte + transfers row).
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS transfer_id UUID REFERENCES public.transfers(id) ON DELETE SET NULL;

ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS transfer_role TEXT;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'transactions_transfer_role_check'
  ) THEN
    ALTER TABLE public.transactions
      ADD CONSTRAINT transactions_transfer_role_check
      CHECK (transfer_role IS NULL OR transfer_role IN ('out', 'in'));
  END IF;
END $$;

-- Coherencia: si una columna está, la otra también. No se puede tener
-- transfer_id sin role ni viceversa.
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'transactions_transfer_consistency_check'
  ) THEN
    ALTER TABLE public.transactions
      ADD CONSTRAINT transactions_transfer_consistency_check
      CHECK (
        (transfer_id IS NULL AND transfer_role IS NULL)
        OR (transfer_id IS NOT NULL AND transfer_role IS NOT NULL)
      );
  END IF;
END $$;

-- ------------------------------------------------------------
-- TRANSACTIONS — índice parcial para JOIN/lookup por transfer
-- ------------------------------------------------------------
-- Parcial sobre transfer_id IS NOT NULL: la mayoría de las transactions
-- no son transferencias, no inflamos el índice. Soporta:
--   SELECT * FROM transactions WHERE transfer_id = $1;
--   (lookup de la contraparte al borrar/editar)
CREATE INDEX IF NOT EXISTS transactions_transfer_idx
  ON public.transactions (transfer_id)
  WHERE transfer_id IS NOT NULL;

-- ------------------------------------------------------------
-- Sobre el `type` de cada punta
-- ------------------------------------------------------------
-- Decisión replicada del patrón de migration 028 (goal_deposit):
-- NO se agrega un type='transfer' al CHECK de transactions.type.
-- Cada punta usa el type que corresponde según el bucket que toca:
--   bucket general    → type='income' (in) / type='expense' (out)
--   bucket savings    → type='savings'  (signo dado por el monto)
--   bucket portfolio  → type='investment' (signo dado por el monto)
--   bucket goal       → type='savings' con goal_id
-- El discriminador de "esto es una transferencia" es transfer_id.
-- Las KPIs de Ingresos/Gastos del mes filtran transfer_id IS NULL para
-- no contar transferencias internas.

-- ------------------------------------------------------------
-- Notas para PRs siguientes (NO se aplican acá)
-- ------------------------------------------------------------
-- A3 (FX cross-currency MEP):
--   · Sin schema changes. fx_rate ya existe nullable en transfers.
--   · La validación "currency_mismatch" se relaja en createTransfer.
--
-- A4 (refactor withdrawToPortfolio):
--   · Sin schema changes. Solo deja de hacer el insert ad-hoc
--     y llama createTransfer con kind='savings' → kind='portfolio'.
