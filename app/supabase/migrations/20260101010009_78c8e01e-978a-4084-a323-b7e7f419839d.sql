-- Add total_kooks_received column to profiles table
ALTER TABLE public.profiles
ADD COLUMN total_kooks_received integer NOT NULL DEFAULT 0;