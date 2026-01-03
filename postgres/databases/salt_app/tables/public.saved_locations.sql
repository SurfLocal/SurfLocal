-- Saved locations table - User's saved map locations
CREATE TABLE public.saved_locations (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    name TEXT NOT NULL,
    latitude NUMERIC NOT NULL,
    longitude NUMERIC NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    CONSTRAINT saved_locations_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Create index on user_id for user saved location queries
CREATE INDEX idx_saved_locations_user_id ON public.saved_locations(user_id);

-- Create spatial index for location-based queries
CREATE INDEX idx_saved_locations_location ON public.saved_locations(latitude, longitude);

COMMENT ON TABLE public.saved_locations IS 'User-saved custom map locations';
