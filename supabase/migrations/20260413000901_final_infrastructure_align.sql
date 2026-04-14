-- Final alignment for Tracking Pixels and Marketing Infrastructure
-- Ensures columns match exactly what is being selected in the frontend

ALTER TABLE IF EXISTS public.system_settings 
ADD COLUMN IF NOT EXISTS meta_pixel_id TEXT,
ADD COLUMN IF NOT EXISTS google_pixel_id TEXT,
ADD COLUMN IF NOT EXISTS tiktok_pixel_id TEXT,
ADD COLUMN IF NOT EXISTS x_pixel_id TEXT,
ADD COLUMN IF NOT EXISTS resend_api_key TEXT,
ADD COLUMN IF NOT EXISTS whatsapp_phone_id TEXT,
ADD COLUMN IF NOT EXISTS whatsapp_access_token TEXT,
ADD COLUMN IF NOT EXISTS whatsapp_business_id TEXT;

-- Verify if we have a general group row, if not create one
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.system_settings WHERE "group" = 'general') THEN
        INSERT INTO public.system_settings ("group", "key", "value") 
        VALUES ('general', 'platform_config', '{}');
    END IF;
END $$;
