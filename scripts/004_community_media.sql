-- ============================================================
-- MFI – Más Fácil Imposible
-- Migration 004: Community media (image_urls on posts/comments
-- + public storage bucket `community-media`).
-- Idempotent.
-- ============================================================

-- --------------------------------------------------------
-- Columns: image_urls TEXT[]
-- --------------------------------------------------------
ALTER TABLE public.community_posts
  ADD COLUMN IF NOT EXISTS image_urls TEXT[] NOT NULL DEFAULT '{}';

ALTER TABLE public.community_comments
  ADD COLUMN IF NOT EXISTS image_urls TEXT[] NOT NULL DEFAULT '{}';

-- Cap images per row at 4 — enforced in SQL so a malicious client can't
-- stuff arbitrary arrays into a post.
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'community_posts_image_urls_len_chk'
  ) THEN
    ALTER TABLE public.community_posts
      ADD CONSTRAINT community_posts_image_urls_len_chk
      CHECK (array_length(image_urls, 1) IS NULL OR array_length(image_urls, 1) <= 4);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'community_comments_image_urls_len_chk'
  ) THEN
    ALTER TABLE public.community_comments
      ADD CONSTRAINT community_comments_image_urls_len_chk
      CHECK (array_length(image_urls, 1) IS NULL OR array_length(image_urls, 1) <= 1);
  END IF;
END $$;

-- Relax the original body length check on comments: allow empty body when an
-- image is attached. Previously body had to be 1–2000 chars; now it's 0–2000
-- but with a combined NOT-BOTH-EMPTY constraint.
ALTER TABLE public.community_comments
  DROP CONSTRAINT IF EXISTS community_comments_body_check;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'community_comments_body_length_chk'
  ) THEN
    ALTER TABLE public.community_comments
      ADD CONSTRAINT community_comments_body_length_chk
      CHECK (char_length(body) <= 2000);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'community_comments_non_empty_chk'
  ) THEN
    ALTER TABLE public.community_comments
      ADD CONSTRAINT community_comments_non_empty_chk
      CHECK (
        char_length(body) > 0
        OR array_length(image_urls, 1) IS NOT NULL
      );
  END IF;
END $$;

-- --------------------------------------------------------
-- Storage bucket: community-media (public read, write own folder)
-- Mirrors the `avatars` bucket policy pattern from 005_profiles_mood_nickname.sql.
-- Path convention: `{user_id}/{uuid}.{ext}` — enforced by RLS.
-- --------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('community-media', 'community-media', true)
ON CONFLICT (id) DO NOTHING;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='objects' AND policyname='community_media_select') THEN
    CREATE POLICY "community_media_select" ON storage.objects
      FOR SELECT USING (bucket_id = 'community-media');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='objects' AND policyname='community_media_insert') THEN
    CREATE POLICY "community_media_insert" ON storage.objects
      FOR INSERT WITH CHECK (
        bucket_id = 'community-media'
        AND auth.uid()::text = (storage.foldername(name))[1]
      );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='objects' AND policyname='community_media_update') THEN
    CREATE POLICY "community_media_update" ON storage.objects
      FOR UPDATE USING (
        bucket_id = 'community-media'
        AND auth.uid()::text = (storage.foldername(name))[1]
      );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='objects' AND policyname='community_media_delete') THEN
    CREATE POLICY "community_media_delete" ON storage.objects
      FOR DELETE USING (
        bucket_id = 'community-media'
        AND auth.uid()::text = (storage.foldername(name))[1]
      );
  END IF;
END $$;
