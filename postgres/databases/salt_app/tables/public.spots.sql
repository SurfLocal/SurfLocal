-- Spots table - Surf spots/locations
CREATE TABLE public.spots (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    location TEXT NOT NULL,
    latitude NUMERIC NOT NULL,
    longitude NUMERIC NOT NULL,
    description TEXT,
    difficulty TEXT,
    break_type TEXT,
    timezone TEXT NOT NULL DEFAULT 'America/Los_Angeles',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index on name for search
CREATE INDEX idx_spots_name ON public.spots(name);

-- Create spatial index for location-based queries
CREATE INDEX idx_spots_location ON public.spots(latitude, longitude);

COMMENT ON TABLE public.spots IS 'Surf spot locations and information';
COMMENT ON COLUMN public.spots.break_type IS 'Type of break (e.g., beach, reef, point)';
COMMENT ON COLUMN public.spots.difficulty IS 'Difficulty level for surfers';
