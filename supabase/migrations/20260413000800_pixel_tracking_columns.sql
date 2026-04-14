-- Migration: Add fields for Tracking Pixels and Communication Providers (Resend/Meta)
-- This allows the Intelligence Hub to automatically inject tracking scripts and manage newsletter/alerts.

ALTER TABLE IF EXISTS public.system_settings 
ADD COLUMN IF NOT EXISTS meta_pixel_id TEXT,
ADD COLUMN IF NOT EXISTS google_pixel_id TEXT,
ADD COLUMN IF NOT EXISTS tiktok_pixel_id TEXT,
ADD COLUMN IF NOT EXISTS x_pixel_id TEXT,
ADD COLUMN IF NOT EXISTS resend_api_key TEXT,
ADD COLUMN IF NOT EXISTS whatsapp_phone_id TEXT,
ADD COLUMN IF NOT EXISTS whatsapp_access_token TEXT,
ADD COLUMN IF NOT EXISTS whatsapp_business_id TEXT;

-- Seed default values (optional, keeping current settings)
-- UPDATE public.system_settings SET meta_pixel_id = '' WHERE meta_pixel_id IS NULL;

COMMENT ON COLUMN public.system_settings.meta_pixel_id IS 'Meta Pixel tracking ID for automatic script injection';
COMMENT ON COLUMN public.system_settings.google_pixel_id IS 'Google Analytics / Tag Manager ID';
COMMENT ON COLUMN public.system_settings.resend_api_key IS 'API Key for Resend email provider';
COMMENT ON COLUMN public.system_settings.whatsapp_phone_id IS 'Meta WhatsApp Business API Phone ID';
