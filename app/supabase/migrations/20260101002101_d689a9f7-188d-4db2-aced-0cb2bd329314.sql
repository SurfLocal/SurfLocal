-- Add duration_minutes column to sessions table
ALTER TABLE public.sessions ADD COLUMN duration_minutes integer DEFAULT NULL;