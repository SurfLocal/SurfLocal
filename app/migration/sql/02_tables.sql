-- ============================================
-- TABLES
-- Run after enums are created
-- ============================================

-- ----------------------------------------
-- PROFILES TABLE
-- Stores user profile information
-- ----------------------------------------
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
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- ----------------------------------------
-- USER_ROLES TABLE
-- Stores user roles for authorization
-- ----------------------------------------
CREATE TABLE public.user_roles (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    role app_role NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

-- ----------------------------------------
-- SPOTS TABLE
-- Surf spots/locations
-- ----------------------------------------
CREATE TABLE public.spots (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    location TEXT NOT NULL,
    latitude NUMERIC NOT NULL,
    longitude NUMERIC NOT NULL,
    description TEXT,
    difficulty TEXT,
    break_type TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- ----------------------------------------
-- BOARDS TABLE
-- User's surfboards (quiver)
-- ----------------------------------------
CREATE TABLE public.boards (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    name TEXT NOT NULL,
    brand TEXT,
    model TEXT,
    board_type TEXT,
    length_feet INTEGER,
    length_inches INTEGER,
    volume_liters NUMERIC,
    photo_url TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- ----------------------------------------
-- SESSIONS TABLE
-- Surf sessions logged by users
-- ----------------------------------------
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
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- ----------------------------------------
-- SESSION_MEDIA TABLE
-- Photos/videos attached to sessions
-- ----------------------------------------
CREATE TABLE public.session_media (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id UUID NOT NULL,
    user_id UUID NOT NULL,
    url TEXT NOT NULL,
    media_type TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- ----------------------------------------
-- SESSION_SWELL_DATA TABLE
-- Swell/weather conditions for sessions
-- ----------------------------------------
CREATE TABLE public.session_swell_data (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id UUID NOT NULL,
    swell_height NUMERIC,
    swell_direction TEXT,
    wind_speed NUMERIC,
    wind_direction TEXT,
    tide_height NUMERIC,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- ----------------------------------------
-- SESSION_LIKES TABLE
-- Shaka/likes on sessions
-- ----------------------------------------
CREATE TABLE public.session_likes (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id UUID NOT NULL,
    user_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (session_id, user_id)
);

-- ----------------------------------------
-- SESSION_KOOKS TABLE
-- Kook reactions on sessions
-- ----------------------------------------
CREATE TABLE public.session_kooks (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id UUID NOT NULL,
    user_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (session_id, user_id)
);

-- ----------------------------------------
-- SESSION_COMMENTS TABLE
-- Comments on sessions
-- ----------------------------------------
CREATE TABLE public.session_comments (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id UUID NOT NULL,
    user_id UUID NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- ----------------------------------------
-- FOLLOWS TABLE
-- User follow relationships
-- ----------------------------------------
CREATE TABLE public.follows (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    follower_id UUID NOT NULL,
    following_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (follower_id, following_id)
);

-- ----------------------------------------
-- FAVORITE_SPOTS TABLE
-- User's favorite surf spots
-- ----------------------------------------
CREATE TABLE public.favorite_spots (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    spot_id UUID NOT NULL,
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, spot_id)
);

-- ----------------------------------------
-- SAVED_LOCATIONS TABLE
-- User's saved map locations
-- ----------------------------------------
CREATE TABLE public.saved_locations (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    name TEXT NOT NULL,
    latitude NUMERIC NOT NULL,
    longitude NUMERIC NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- ----------------------------------------
-- FORECAST_COMMENTS TABLE
-- Comments on spot forecasts
-- ----------------------------------------
CREATE TABLE public.forecast_comments (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    spot_id UUID NOT NULL,
    user_id UUID NOT NULL,
    content TEXT NOT NULL,
    parent_id UUID,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- ----------------------------------------
-- FORECAST_COMMENT_LIKES TABLE
-- Likes on forecast comments
-- ----------------------------------------
CREATE TABLE public.forecast_comment_likes (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    comment_id UUID NOT NULL,
    user_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (comment_id, user_id)
);

-- ----------------------------------------
-- FORECAST_COMMENT_KOOKS TABLE
-- Kook reactions on forecast comments
-- ----------------------------------------
CREATE TABLE public.forecast_comment_kooks (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    comment_id UUID NOT NULL,
    user_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (comment_id, user_id)
);

-- ============================================
-- FOREIGN KEY CONSTRAINTS
-- Add after all tables are created
-- ============================================

-- Note: In Supabase, user_id references auth.users(id)
-- For self-hosted Postgres, you'll need to create your own users table
-- or use an auth provider that manages users

-- Example for self-hosted (uncomment and modify as needed):
-- ALTER TABLE public.profiles ADD CONSTRAINT profiles_user_id_fkey 
--     FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add foreign key for sessions -> boards
ALTER TABLE public.sessions ADD CONSTRAINT sessions_board_id_fkey 
    FOREIGN KEY (board_id) REFERENCES public.boards(id) ON DELETE SET NULL;

-- Add foreign key for session_media -> sessions
ALTER TABLE public.session_media ADD CONSTRAINT session_media_session_id_fkey 
    FOREIGN KEY (session_id) REFERENCES public.sessions(id) ON DELETE CASCADE;

-- Add foreign key for session_swell_data -> sessions
ALTER TABLE public.session_swell_data ADD CONSTRAINT session_swell_data_session_id_fkey 
    FOREIGN KEY (session_id) REFERENCES public.sessions(id) ON DELETE CASCADE;

-- Add foreign key for session_likes -> sessions
ALTER TABLE public.session_likes ADD CONSTRAINT session_likes_session_id_fkey 
    FOREIGN KEY (session_id) REFERENCES public.sessions(id) ON DELETE CASCADE;

-- Add foreign key for session_kooks -> sessions
ALTER TABLE public.session_kooks ADD CONSTRAINT session_kooks_session_id_fkey 
    FOREIGN KEY (session_id) REFERENCES public.sessions(id) ON DELETE CASCADE;

-- Add foreign key for session_comments -> sessions
ALTER TABLE public.session_comments ADD CONSTRAINT session_comments_session_id_fkey 
    FOREIGN KEY (session_id) REFERENCES public.sessions(id) ON DELETE CASCADE;

-- Add foreign key for favorite_spots -> spots
ALTER TABLE public.favorite_spots ADD CONSTRAINT favorite_spots_spot_id_fkey 
    FOREIGN KEY (spot_id) REFERENCES public.spots(id) ON DELETE CASCADE;

-- Add foreign key for forecast_comments -> spots
ALTER TABLE public.forecast_comments ADD CONSTRAINT forecast_comments_spot_id_fkey 
    FOREIGN KEY (spot_id) REFERENCES public.spots(id) ON DELETE CASCADE;

-- Add self-referencing foreign key for forecast_comments (replies)
ALTER TABLE public.forecast_comments ADD CONSTRAINT forecast_comments_parent_id_fkey 
    FOREIGN KEY (parent_id) REFERENCES public.forecast_comments(id) ON DELETE CASCADE;

-- Add foreign key for forecast_comment_likes -> forecast_comments
ALTER TABLE public.forecast_comment_likes ADD CONSTRAINT forecast_comment_likes_comment_id_fkey 
    FOREIGN KEY (comment_id) REFERENCES public.forecast_comments(id) ON DELETE CASCADE;

-- Add foreign key for forecast_comment_kooks -> forecast_comments
ALTER TABLE public.forecast_comment_kooks ADD CONSTRAINT forecast_comment_kooks_comment_id_fkey 
    FOREIGN KEY (comment_id) REFERENCES public.forecast_comments(id) ON DELETE CASCADE;
