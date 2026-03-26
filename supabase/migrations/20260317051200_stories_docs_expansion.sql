-- Add metadata and author tracking for Documents and Stories
ALTER TABLE public.stories_lives ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS author_id UUID REFERENCES public.profiles(user_id) ON DELETE SET NULL;
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS platform TEXT;
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'available';
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- Migration to ensure stories older than 24h are marked as archived instead of deleted (logic handled in app layer/edge functions)
-- But we can add a comment or a trigger if needed. For now, we'll handle it via logic.

-- Update existing documents if they don't have an author_id
UPDATE public.documents SET author_id = user_id WHERE author_id IS NULL;
