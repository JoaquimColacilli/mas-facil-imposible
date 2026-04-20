-- ============================================================
-- MFI – Más Fácil Imposible
-- Migration 025: Track edited_at on community_posts so the UI
-- can badge posts that were modified after publication.
-- Idempotent.
-- ============================================================

ALTER TABLE public.community_posts
  ADD COLUMN IF NOT EXISTS edited_at TIMESTAMPTZ;
