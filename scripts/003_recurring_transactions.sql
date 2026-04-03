-- ============================================================
-- Migration 003: Recurring transactions
-- Adds columns to support monthly recurring expenses/income.
-- The last transaction with is_recurring = true acts as the
-- template for the next month (no separate templates table).
-- ============================================================

-- is_recurring: marks this transaction as repeating monthly
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'transactions' AND column_name = 'is_recurring'
  ) THEN
    ALTER TABLE public.transactions ADD COLUMN is_recurring BOOLEAN NOT NULL DEFAULT false;
  END IF;
END $$;

-- recurring_source_id: points to the previous-month transaction this was generated from.
-- Used for idempotency (don't generate twice) and lineage tracking.
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'transactions' AND column_name = 'recurring_source_id'
  ) THEN
    ALTER TABLE public.transactions ADD COLUMN recurring_source_id UUID REFERENCES public.transactions(id) ON DELETE SET NULL;
  END IF;
END $$;
