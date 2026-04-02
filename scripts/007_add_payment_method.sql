-- 007: Add payment_method column to transactions
-- Tracks how a transaction was paid: cash, debit, or credit card.
-- Credit card expenses are created with status='pending' and can be bulk-confirmed later.

ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT NULL
  CHECK (payment_method IN ('cash', 'debit', 'credit'));
