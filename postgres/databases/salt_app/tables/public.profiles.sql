-- Profiles table - User profile information
CREATE TABLE public.profiles (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL UNIQUE,
    display_name TEXT,
    bio TEXT,
    avatar_url TEXT,
    home_break TEXT,
    years_surfing INTEGER,
    longest_streak INTEGER DEFAULT 0,
    longest_streak_start DATE,
    total_shakas_received INTEGER NOT NULL DEFAULT 0,
    total_kooks_received INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    CONSTRAINT profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Create index on user_id for faster lookups
CREATE INDEX idx_profiles_user_id ON public.profiles(user_id);

COMMENT ON TABLE public.profiles IS 'User profile data and surfing statistics';
COMMENT ON COLUMN public.profiles.user_id IS 'References auth.users.id';
COMMENT ON COLUMN public.profiles.longest_streak IS 'Longest consecutive days surfing';
COMMENT ON COLUMN public.profiles.total_shakas_received IS 'Total likes/shakas received on sessions';
COMMENT ON COLUMN public.profiles.total_kooks_received IS 'Total kook reactions received on sessions';
