-- Migration to add metadata column to messages table
-- Date: 2026-04-14

ALTER TABLE public.messages 
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- Index for integration type searches
CREATE INDEX IF NOT EXISTS idx_messages_metadata_integration_type ON public.messages ((metadata->>'integration_type'));
