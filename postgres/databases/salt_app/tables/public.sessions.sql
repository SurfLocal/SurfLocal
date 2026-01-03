-- Sessions table - Surf sessions logged by users
CREATE TABLE public.sessions (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    location TEXT NOT NULL,
    latitude NUMERIC,
    longitude NUMERIC,
    session_date TIMESTAMP WITH TIME ZONE NOT NULL,
    duration_minutes INTEGER,
    wave_height TEXT,
    wave_count INTEGER,
    wave_consistency TEXT,
    shape TEXT,
    power TEXT,
    crowd TEXT,
    form TEXT,
    rating TEXT,
    gear TEXT,
    notes TEXT,
    board_id UUID,
    barrel_count INTEGER,
    air_count INTEGER,
    is_public BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    CONSTRAINT sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
    CONSTRAINT sessions_board_id_fkey FOREIGN KEY (board_id) REFERENCES public.boards(id) ON DELETE SET NULL
);

-- Create index on user_id for user session queries
CREATE INDEX idx_sessions_user_id ON public.sessions(user_id);

-- Create index on session_date for chronological queries
CREATE INDEX idx_sessions_date ON public.sessions(session_date DESC);

-- Create index on is_public for feed queries
CREATE INDEX idx_sessions_public ON public.sessions(is_public) WHERE is_public = true;

-- Create composite index for public feed queries
CREATE INDEX idx_sessions_public_date ON public.sessions(is_public, session_date DESC) WHERE is_public = true;

COMMENT ON TABLE public.sessions IS 'Logged surf sessions with conditions and ratings';
COMMENT ON COLUMN public.sessions.wave_height IS 'Wave height range (e.g., "3-4")';
COMMENT ON COLUMN public.sessions.gear IS 'Wetsuit or gear worn';
COMMENT ON COLUMN public.sessions.is_public IS 'Whether session is visible to other users';
COMMENT ON COLUMN public.sessions.barrel_count IS 'Number of barrels scored';
COMMENT ON COLUMN public.sessions.air_count IS 'Number of airs landed';
