-- ============================================================
-- MFI – Más Fácil Imposible
-- Migration 020: Allow 'wrapped' embed kind on community_posts
--
-- The original check in 003_community.sql only allowed 'txn' and 'goal'.
-- The Monthly Wrapped feature publishes a snapshot-style embed with
-- kind='wrapped', so we extend the constraint.
--
-- Idempotent: drops the old constraint (if present) and recreates it with
-- the expanded whitelist.
-- ============================================================

ALTER TABLE public.community_posts
  DROP CONSTRAINT IF EXISTS community_posts_embed_kind_chk;

ALTER TABLE public.community_posts
  ADD CONSTRAINT community_posts_embed_kind_chk CHECK (
    embed IS NULL OR (embed->>'kind') IN ('txn','goal','wrapped')
  );
