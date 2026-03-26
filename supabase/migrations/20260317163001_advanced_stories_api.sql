-- Migration: Advanced Stories & API Settings
-- Add more columns to stories_lives if they don't exist
ALTER TABLE public.stories_lives ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';
ALTER TABLE public.stories_lives ADD COLUMN IF NOT EXISTS author_id UUID REFERENCES public.profiles(user_id) ON DELETE SET NULL;

-- Create table for official API settings
CREATE TABLE IF NOT EXISTS public.api_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(user_id) ON DELETE CASCADE,
    platform TEXT NOT NULL, -- 'meta', 'google', 'spotify', 'giphy'
    config_name TEXT NOT NULL, -- e.g., 'marketing_api_key', 'maps_key'
    config_value TEXT NOT NULL, -- Encrypted value (ideally)
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, platform, config_name)
);

-- RLS for api_settings
ALTER TABLE public.api_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own api_settings" ON public.api_settings
    FOR ALL USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON public.api_settings
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();
