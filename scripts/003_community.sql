-- ============================================================
-- MFI – Más Fácil Imposible
-- Migration 003: Community (posts, comments, votes, saves)
-- Idempotent.
-- ============================================================

-- --------------------------------------------------------
-- COMMUNITY POSTS
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.community_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN (
    'inversiones','ahorros','dolar','plazosfijos','cripto','gastos','metas','preguntas'
  )),
  title TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 140),
  body TEXT NOT NULL DEFAULT '',
  embed JSONB,
  vote_count INT NOT NULL DEFAULT 0,
  comment_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  CONSTRAINT community_posts_embed_kind_chk CHECK (
    embed IS NULL OR (embed->>'kind') IN ('txn','goal')
  )
);

CREATE INDEX IF NOT EXISTS community_posts_category_created_idx
  ON public.community_posts (category, created_at DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS community_posts_votes_idx
  ON public.community_posts (vote_count DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS community_posts_created_idx
  ON public.community_posts (created_at DESC)
  WHERE deleted_at IS NULL;

ALTER TABLE public.community_posts ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='community_posts' AND policyname='community_posts_select_public') THEN
    CREATE POLICY "community_posts_select_public" ON public.community_posts
      FOR SELECT USING (auth.role() = 'authenticated');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='community_posts' AND policyname='community_posts_insert_own') THEN
    CREATE POLICY "community_posts_insert_own" ON public.community_posts
      FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='community_posts' AND policyname='community_posts_update_own') THEN
    CREATE POLICY "community_posts_update_own" ON public.community_posts
      FOR UPDATE USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='community_posts' AND policyname='community_posts_delete_own') THEN
    CREATE POLICY "community_posts_delete_own" ON public.community_posts
      FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

-- --------------------------------------------------------
-- COMMUNITY COMMENTS
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.community_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
  parent_comment_id UUID REFERENCES public.community_comments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body TEXT NOT NULL CHECK (char_length(body) BETWEEN 1 AND 2000),
  vote_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS community_comments_post_created_idx
  ON public.community_comments (post_id, created_at);

CREATE INDEX IF NOT EXISTS community_comments_parent_idx
  ON public.community_comments (parent_comment_id);

ALTER TABLE public.community_comments ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='community_comments' AND policyname='community_comments_select_public') THEN
    CREATE POLICY "community_comments_select_public" ON public.community_comments
      FOR SELECT USING (auth.role() = 'authenticated');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='community_comments' AND policyname='community_comments_insert_own') THEN
    CREATE POLICY "community_comments_insert_own" ON public.community_comments
      FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='community_comments' AND policyname='community_comments_update_own') THEN
    CREATE POLICY "community_comments_update_own" ON public.community_comments
      FOR UPDATE USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='community_comments' AND policyname='community_comments_delete_own') THEN
    CREATE POLICY "community_comments_delete_own" ON public.community_comments
      FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

-- --------------------------------------------------------
-- COMMUNITY VOTES
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.community_votes (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_kind TEXT NOT NULL CHECK (target_kind IN ('post','comment')),
  target_id UUID NOT NULL,
  value SMALLINT NOT NULL CHECK (value IN (-1, 1)),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, target_kind, target_id)
);

CREATE INDEX IF NOT EXISTS community_votes_target_idx
  ON public.community_votes (target_kind, target_id);

ALTER TABLE public.community_votes ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='community_votes' AND policyname='community_votes_select_own') THEN
    CREATE POLICY "community_votes_select_own" ON public.community_votes
      FOR SELECT USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='community_votes' AND policyname='community_votes_insert_own') THEN
    CREATE POLICY "community_votes_insert_own" ON public.community_votes
      FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='community_votes' AND policyname='community_votes_update_own') THEN
    CREATE POLICY "community_votes_update_own" ON public.community_votes
      FOR UPDATE USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='community_votes' AND policyname='community_votes_delete_own') THEN
    CREATE POLICY "community_votes_delete_own" ON public.community_votes
      FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

-- --------------------------------------------------------
-- COMMUNITY SAVES (bookmarks)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.community_saves (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  post_id UUID NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, post_id)
);

CREATE INDEX IF NOT EXISTS community_saves_post_idx
  ON public.community_saves (post_id);

ALTER TABLE public.community_saves ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='community_saves' AND policyname='community_saves_select_own') THEN
    CREATE POLICY "community_saves_select_own" ON public.community_saves
      FOR SELECT USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='community_saves' AND policyname='community_saves_insert_own') THEN
    CREATE POLICY "community_saves_insert_own" ON public.community_saves
      FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='community_saves' AND policyname='community_saves_delete_own') THEN
    CREATE POLICY "community_saves_delete_own" ON public.community_saves
      FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

-- --------------------------------------------------------
-- TRIGGERS: vote_count (denormalized sum of community_votes.value)
-- --------------------------------------------------------
CREATE OR REPLACE FUNCTION public.apply_community_vote_delta(
  p_kind TEXT, p_id UUID, p_delta INT
) RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF p_delta = 0 THEN RETURN; END IF;
  IF p_kind = 'post' THEN
    UPDATE public.community_posts
       SET vote_count = vote_count + p_delta
     WHERE id = p_id;
  ELSIF p_kind = 'comment' THEN
    UPDATE public.community_comments
       SET vote_count = vote_count + p_delta
     WHERE id = p_id;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_community_votes_bump()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.apply_community_vote_delta(NEW.target_kind, NEW.target_id, NEW.value);
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Assume target_kind/target_id don't change; only value might flip.
    IF OLD.value <> NEW.value THEN
      PERFORM public.apply_community_vote_delta(NEW.target_kind, NEW.target_id, NEW.value - OLD.value);
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM public.apply_community_vote_delta(OLD.target_kind, OLD.target_id, -OLD.value);
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_community_votes_bump ON public.community_votes;
CREATE TRIGGER trg_community_votes_bump
  AFTER INSERT OR UPDATE OR DELETE ON public.community_votes
  FOR EACH ROW EXECUTE FUNCTION public.trg_community_votes_bump();

-- --------------------------------------------------------
-- TRIGGERS: comment_count (denormalized on community_posts)
-- Soft-deletes (deleted_at) are treated as removals.
-- --------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trg_community_comments_count()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.deleted_at IS NULL THEN
      UPDATE public.community_posts
         SET comment_count = comment_count + 1
       WHERE id = NEW.post_id;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL THEN
      UPDATE public.community_posts
         SET comment_count = GREATEST(comment_count - 1, 0)
       WHERE id = NEW.post_id;
    ELSIF OLD.deleted_at IS NOT NULL AND NEW.deleted_at IS NULL THEN
      UPDATE public.community_posts
         SET comment_count = comment_count + 1
       WHERE id = NEW.post_id;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.deleted_at IS NULL THEN
      UPDATE public.community_posts
         SET comment_count = GREATEST(comment_count - 1, 0)
       WHERE id = OLD.post_id;
    END IF;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_community_comments_count ON public.community_comments;
CREATE TRIGGER trg_community_comments_count
  AFTER INSERT OR UPDATE OR DELETE ON public.community_comments
  FOR EACH ROW EXECUTE FUNCTION public.trg_community_comments_count();
