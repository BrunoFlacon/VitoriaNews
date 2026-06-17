-- Migration: Add publishing columns to tasks table
-- Allows Kanban tasks to participate in the existing publication pipeline

ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS platforms TEXT[] DEFAULT '{}';
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS published_post_id UUID REFERENCES public.scheduled_posts(id) ON DELETE SET NULL;
