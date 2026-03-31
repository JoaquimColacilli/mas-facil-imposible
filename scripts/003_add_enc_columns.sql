-- Migration: add enc_data column to tables with sensitive fields.
-- Run this in Supabase SQL editor before deploying the encryption feature.
--
-- Encrypted fields per table:
--   transactions : amount, note
--   goals        : name, target_amount, current_amount
--   loans        : person_name, amount, note
--   debts        : person_name, amount, note
--
-- The original columns (amount, note, person_name, name) will be zeroed/nulled
-- after running scripts/migrate-encrypt.ts. Until then, both old and new rows
-- are handled gracefully: decryptRow() falls back to plaintext for rows that
-- have no enc_data yet.

ALTER TABLE transactions ADD COLUMN IF NOT EXISTS enc_data text;
ALTER TABLE goals        ADD COLUMN IF NOT EXISTS enc_data text;
ALTER TABLE loans        ADD COLUMN IF NOT EXISTS enc_data text;
ALTER TABLE debts        ADD COLUMN IF NOT EXISTS enc_data text;

-- The amount column previously required amount > 0.
-- With encryption, the plaintext column stores 0 as a dummy value,
-- so we relax the constraint to amount >= 0.
ALTER TABLE loans DROP CONSTRAINT IF EXISTS loans_amount_check;
ALTER TABLE loans ADD  CONSTRAINT loans_amount_check CHECK (amount >= 0);
ALTER TABLE debts DROP CONSTRAINT IF EXISTS debts_amount_check;
ALTER TABLE debts ADD  CONSTRAINT debts_amount_check CHECK (amount >= 0);
