-- Add tide_height column to session_swell_data table
ALTER TABLE public.session_swell_data 
ADD COLUMN IF NOT EXISTS tide_height numeric;