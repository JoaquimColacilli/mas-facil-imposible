-- ============================================================
-- Migration 005: track number of transactions extracted per AI call.
-- Default 1 keeps existing rows correct (those were single-tx calls).
-- The daily quota stays at 20 ROWS in ai_usage — n_extracted is
-- analytics only, does not affect rate limiting (a PDF with 20
-- transactions still counts as 1 call against the quota).
-- ============================================================

ALTER TABLE public.ai_usage
  ADD COLUMN IF NOT EXISTS n_extracted INTEGER NOT NULL DEFAULT 1;
