-- Migration: add last_seen_version column to profiles.
-- Run this in Supabase SQL editor.
-- This column tracks which changelog version each user has seen,
-- so the "What's New" modal only appears once per new release.

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_seen_version text;
