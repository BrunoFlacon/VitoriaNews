-- Add code_verifier column to oauth_states table for S256 PKCE support
ALTER TABLE public.oauth_states 
ADD COLUMN IF NOT EXISTS code_verifier TEXT;

COMMENT ON COLUMN public.oauth_states.code_verifier IS 'Stores the PKCE code verifier for OAuth 2.0 flows (required for Twitter/X).';
