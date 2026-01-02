-- Create swell data table for session conditions
CREATE TABLE public.session_swell_data (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  swell_height NUMERIC,
  swell_direction TEXT,
  wind_speed NUMERIC,
  wind_direction TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.session_swell_data ENABLE ROW LEVEL SECURITY;

-- Anyone can view swell data for public sessions
CREATE POLICY "Anyone can view swell data for public sessions"
ON public.session_swell_data
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM sessions s 
    WHERE s.id = session_swell_data.session_id 
    AND (s.is_public = true OR s.user_id = auth.uid())
  )
);

-- Only admins/system can insert swell data (will be populated by backend)
CREATE POLICY "System can insert swell data"
ON public.session_swell_data
FOR INSERT
WITH CHECK (true);

-- Create index for faster lookups
CREATE INDEX idx_session_swell_data_session_id ON public.session_swell_data(session_id);