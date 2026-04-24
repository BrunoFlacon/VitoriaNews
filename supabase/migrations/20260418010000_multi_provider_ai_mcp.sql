-- Migração completa para expandir as configurações de IA e UX
ALTER TABLE public.bot_settings 
ADD COLUMN IF NOT EXISTS ai_provider TEXT DEFAULT 'openai',
ADD COLUMN IF NOT EXISTS ai_model TEXT DEFAULT 'gpt-4o-mini',
ADD COLUMN IF NOT EXISTS groq_api_key TEXT,
ADD COLUMN IF NOT EXISTS openrouter_api_key TEXT,
ADD COLUMN IF NOT EXISTS claude_api_key TEXT,
ADD COLUMN IF NOT EXISTS gemini_api_key TEXT,
ADD COLUMN IF NOT EXISTS openai_api_key TEXT,
ADD COLUMN IF NOT EXISTS mcp_config JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS floating_button_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS audio_alerts_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS silence_duration_hours INTEGER DEFAULT 1;

-- Comentários para documentação
COMMENT ON COLUMN public.bot_settings.ai_provider IS 'Provedor de IA: openai, groq, openrouter, google';
COMMENT ON COLUMN public.bot_settings.ai_model IS 'ID do modelo (gpt-4o, llama-3-70b, etc)';
COMMENT ON COLUMN public.bot_settings.floating_button_enabled IS 'Se o widget flutuante deve aparecer no site/app';
