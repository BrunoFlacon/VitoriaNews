-- ============================================================
-- AUDIENCE HUB & CONTACTS TABLES
-- Date: 2026-04-10
-- ============================================================

-- 1. AUDIENCE LOGS: Registros históricos de audiência por horário
CREATE TABLE IF NOT EXISTS public.messaging_audience_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  channel_id TEXT NOT NULL,               -- foreign key to messaging_channels.channel_id  
  platform TEXT NOT NULL,
  members_total INTEGER DEFAULT 0,
  members_online INTEGER DEFAULT 0,
  logged_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  CONSTRAINT fk_audience_user FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- 2. MESSAGING MEMBERS: Contatos identificados nos grupos/canais
CREATE TABLE IF NOT EXISTS public.messaging_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,                  -- owner (logged in user) 
  channel_id TEXT,                        -- which group/channel they belong to
  platform TEXT NOT NULL,
  
  -- Contact identity
  phone_number TEXT,
  username TEXT,                          -- @handle (Telegram, future WhatsApp, Instagram)
  full_name TEXT,
  first_name TEXT,
  last_name TEXT,
  profile_picture TEXT,
  
  -- Platform-specific role
  role TEXT DEFAULT 'member',             -- 'admin', 'moderator', 'member', 'individual'
  
  -- Identifiers across platforms
  telegram_user_id BIGINT,
  whatsapp_id TEXT,
  google_contact_id TEXT,                 -- After sync with Google Contacts
  
  -- Status
  is_admin BOOLEAN DEFAULT false,
  is_online BOOLEAN DEFAULT false,
  last_seen TIMESTAMP WITH TIME ZONE,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  CONSTRAINT fk_members_user FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- 3. Row Level Security
ALTER TABLE public.messaging_audience_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messaging_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own audience logs" ON public.messaging_audience_logs 
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users manage own members" ON public.messaging_members 
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 4. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_audience_logs_channel ON public.messaging_audience_logs(channel_id, logged_at DESC);
CREATE INDEX IF NOT EXISTS idx_audience_logs_user ON public.messaging_audience_logs(user_id, logged_at DESC);
CREATE INDEX IF NOT EXISTS idx_members_channel ON public.messaging_members(channel_id, platform);
CREATE INDEX IF NOT EXISTS idx_members_user ON public.messaging_members(user_id, platform);
CREATE INDEX IF NOT EXISTS idx_members_username ON public.messaging_members(username);
CREATE INDEX IF NOT EXISTS idx_members_phone ON public.messaging_members(phone_number);

-- 5. Realtime for live updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.messaging_audience_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messaging_members;
