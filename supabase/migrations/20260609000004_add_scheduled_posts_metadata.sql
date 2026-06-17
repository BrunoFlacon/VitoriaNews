-- Migration: Add metadata JSONB column to scheduled_posts
-- Stores per-slide transforms (zoom, position, objectFit) for carousel editor
ALTER TABLE public.scheduled_posts ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';
