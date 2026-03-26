-- Add unique constraint for (user_id, platform) to support upsert operations
ALTER TABLE public.api_credentials
ADD CONSTRAINT api_credentials_user_id_platform_key UNIQUE (user_id, platform);
