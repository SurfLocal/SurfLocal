-- Session swell data table - Swell/weather conditions for sessions
CREATE TABLE public.session_swell_data (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id UUID NOT NULL,
    swell_height NUMERIC,
    swell_direction TEXT,
    wind_speed NUMERIC,
    wind_direction TEXT,
    tide_height NUMERIC,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    CONSTRAINT session_swell_data_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.sessions(id) ON DELETE CASCADE
);

-- Create index on session_id for session swell queries
CREATE INDEX idx_session_swell_data_session_id ON public.session_swell_data(session_id);

COMMENT ON TABLE public.session_swell_data IS 'Detailed swell and weather conditions for surf sessions';
COMMENT ON COLUMN public.session_swell_data.swell_height IS 'Swell height in feet';
COMMENT ON COLUMN public.session_swell_data.wind_speed IS 'Wind speed in mph or knots';
COMMENT ON COLUMN public.session_swell_data.tide_height IS 'Tide height in feet';
