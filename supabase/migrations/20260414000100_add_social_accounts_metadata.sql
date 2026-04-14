-- Migration: Add metadata column to social_accounts
-- Date: 2026-04-14
-- Description: Adds a JSONB metadata column to social_accounts table to store bot configurations and integration-specific data.

ALTER TABLE public.social_accounts 
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- Adjust permissions to ensure the column is accessible
GRANT ALL ON TABLE public.social_accounts TO authenticated;
GRANT ALL ON TABLE public.social_accounts TO service_role;

COMMENT ON COLUMN public.social_accounts.metadata IS 'Stores bot status, specific counters and other dynamic integration data.';
