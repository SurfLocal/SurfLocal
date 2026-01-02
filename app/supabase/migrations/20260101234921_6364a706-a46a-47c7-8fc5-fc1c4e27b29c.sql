-- Add longest streak tracking columns to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS longest_streak INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS longest_streak_start DATE;