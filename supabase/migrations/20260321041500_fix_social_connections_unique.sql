-- Fix unique constraint for social_connections to prevent duplicate accounts per user/platform
ALTER TABLE public.social_connections 
DROP CONSTRAINT IF EXISTS social_connections_user_id_platform_key;

-- We use upsert with this constraint in the Edge Functions
ALTER TABLE public.social_connections 
ADD CONSTRAINT social_connections_user_id_platform_key UNIQUE (user_id, platform);

-- Log the fix
COMMENT ON CONSTRAINT social_connections_user_id_platform_key ON public.social_connections IS 'Ensures one connection per platform for each user, allowing upsert logic in OAuth callbacks.';
