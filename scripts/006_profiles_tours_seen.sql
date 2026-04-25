-- ============================================================
-- Migration 006: per-user "seen" map for one-shot feature tours.
-- Stores { tour_key: ISO_timestamp } so the client knows which
-- tours to skip on next mount. Read-modify-write from the
-- markTourSeen server action — race conditions are not an issue
-- (one tour at a time, idempotent merge).
-- ============================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS tours_seen JSONB NOT NULL DEFAULT '{}'::jsonb;
