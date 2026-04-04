-- Add resolved_transaction_id to loans and debts tables.
-- Links a cobro/deuda to the income/expense transaction created when resolved.
-- Used for idempotency: prevents duplicate transactions on re-clicks.

ALTER TABLE loans
  ADD COLUMN IF NOT EXISTS resolved_transaction_id UUID REFERENCES transactions(id) ON DELETE SET NULL;

ALTER TABLE debts
  ADD COLUMN IF NOT EXISTS resolved_transaction_id UUID REFERENCES transactions(id) ON DELETE SET NULL;
