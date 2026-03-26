
-- Ensure missing tables exist with correct structure and RLS
-- Migration: 20260321090000_ensure_all_tables_exist.sql

-- 1. MESSAGING CHANNELS
CREATE TABLE IF NOT EXISTS messaging_channels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    platform TEXT NOT NULL,
    channel_name TEXT NOT NULL,
    channel_id TEXT, -- platform specific ID (e.g. chat_id)
    channel_type TEXT DEFAULT 'group',
    members_count INTEGER DEFAULT 0,
    online_count INTEGER DEFAULT 0,
    profile_picture TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. MESSAGES
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft',
    platform TEXT,
    recipient_name TEXT,
    recipient_phone TEXT,
    media_url TEXT,
    scheduled_at TIMESTAMPTZ,
    sent_at TIMESTAMPTZ,
    channel_id UUID REFERENCES messaging_channels(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. STORIES & LIVES
CREATE TABLE IF NOT EXISTS stories_lives (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT,
    platform TEXT,
    status TEXT DEFAULT 'pending',
    type TEXT DEFAULT 'story', -- 'story' or 'live'
    media_url TEXT,
    scheduled_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. LIVE SESSIONS
CREATE TABLE IF NOT EXISTS live_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT,
    description TEXT,
    status TEXT DEFAULT 'scheduled',
    scheduled_at TIMESTAMPTZ,
    started_at TIMESTAMPTZ,
    ended_at TIMESTAMPTZ,
    thumbnail_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. LIVE CLIPS
CREATE TABLE IF NOT EXISTS live_clips (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    live_id UUID REFERENCES live_sessions(id) ON DELETE CASCADE,
    title TEXT,
    clip_url TEXT NOT NULL,
    start_time INTEGER,
    end_time INTEGER,
    status TEXT DEFAULT 'processed',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on all new tables
ALTER TABLE messaging_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE stories_lives ENABLE ROW LEVEL SECURITY;
ALTER TABLE live_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE live_clips ENABLE ROW LEVEL SECURITY;

-- Create Policies (using DO block to avoid error if policy already exists)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can manage their own channels') THEN
        CREATE POLICY "Users can manage their own channels" ON messaging_channels FOR ALL USING (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can manage their own messages') THEN
        CREATE POLICY "Users can manage their own messages" ON messages FOR ALL USING (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can manage their own stories_lives') THEN
        CREATE POLICY "Users can manage their own stories_lives" ON stories_lives FOR ALL USING (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can manage their own live sessions') THEN
        CREATE POLICY "Users can manage their own live sessions" ON live_sessions FOR ALL USING (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can manage their own live clips') THEN
        CREATE POLICY "Users can manage their own live clips" ON live_clips FOR ALL USING (auth.uid() = user_id);
    END IF;
END $$;
