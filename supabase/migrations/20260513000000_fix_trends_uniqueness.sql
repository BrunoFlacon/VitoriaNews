-- Fix uniqueness for trends table to allow UPSERT
-- First, clean up duplicates based on keyword
DELETE FROM public.trends a
WHERE a.id NOT IN (
    SELECT MIN(id)
    FROM public.trends
    GROUP BY keyword
);

-- Add the unique constraint
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'trends_keyword_key') THEN
        ALTER TABLE public.trends 
        ADD CONSTRAINT trends_keyword_key UNIQUE (keyword);
    END IF;
END $$;
