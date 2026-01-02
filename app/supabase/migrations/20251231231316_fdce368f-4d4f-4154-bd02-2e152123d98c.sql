-- Add total_shakas_received column to profiles for persistent tracking
-- This tracks total shakas received on daily discussion comments (persists after wipes)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS total_shakas_received INTEGER NOT NULL DEFAULT 0;

-- Create index for leaderboard queries
CREATE INDEX IF NOT EXISTS idx_profiles_total_shakas ON public.profiles(total_shakas_received DESC);