-- ============================================
-- FULL DATABASE SCHEMA - SINGLE FILE SETUP
-- ============================================
-- This file combines all DDL for quick database setup
-- Run this single file to create the complete schema
-- Generated: 2026-01-02
-- ============================================

-- ============================================
-- 1. ENUMS
-- ============================================

CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

-- ============================================
-- 2. TABLES
-- ============================================

-- PROFILES - User profile information
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

-- USER_ROLES - Authorization roles
CREATE TABLE public.user_roles (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    role app_role NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

-- SPOTS - Surf spots/locations
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

-- BOARDS - User's surfboards (quiver)
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

-- SESSIONS - Surf sessions logged by users
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

-- SESSION_MEDIA - Photos/videos attached to sessions
CREATE TABLE public.session_media (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id UUID NOT NULL,
    user_id UUID NOT NULL,
    url TEXT NOT NULL,
    media_type TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- SESSION_SWELL_DATA - Swell/weather conditions for sessions
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

-- SESSION_LIKES - Shaka/likes on sessions
CREATE TABLE public.session_likes (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id UUID NOT NULL,
    user_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (session_id, user_id)
);

-- SESSION_KOOKS - Kook reactions on sessions
CREATE TABLE public.session_kooks (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id UUID NOT NULL,
    user_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (session_id, user_id)
);

-- SESSION_COMMENTS - Comments on sessions
CREATE TABLE public.session_comments (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id UUID NOT NULL,
    user_id UUID NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- FOLLOWS - User follow relationships
CREATE TABLE public.follows (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    follower_id UUID NOT NULL,
    following_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (follower_id, following_id)
);

-- FAVORITE_SPOTS - User's favorite surf spots
CREATE TABLE public.favorite_spots (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    spot_id UUID NOT NULL,
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, spot_id)
);

-- SAVED_LOCATIONS - User's saved map locations
CREATE TABLE public.saved_locations (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    name TEXT NOT NULL,
    latitude NUMERIC NOT NULL,
    longitude NUMERIC NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- FORECAST_COMMENTS - Comments on spot forecasts
CREATE TABLE public.forecast_comments (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    spot_id UUID NOT NULL,
    user_id UUID NOT NULL,
    content TEXT NOT NULL,
    parent_id UUID,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- FORECAST_COMMENT_LIKES - Likes on forecast comments
CREATE TABLE public.forecast_comment_likes (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    comment_id UUID NOT NULL,
    user_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (comment_id, user_id)
);

-- FORECAST_COMMENT_KOOKS - Kook reactions on forecast comments
CREATE TABLE public.forecast_comment_kooks (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    comment_id UUID NOT NULL,
    user_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (comment_id, user_id)
);

-- ============================================
-- 3. FOREIGN KEY CONSTRAINTS
-- ============================================

ALTER TABLE public.sessions ADD CONSTRAINT sessions_board_id_fkey 
    FOREIGN KEY (board_id) REFERENCES public.boards(id) ON DELETE SET NULL;

ALTER TABLE public.session_media ADD CONSTRAINT session_media_session_id_fkey 
    FOREIGN KEY (session_id) REFERENCES public.sessions(id) ON DELETE CASCADE;

ALTER TABLE public.session_swell_data ADD CONSTRAINT session_swell_data_session_id_fkey 
    FOREIGN KEY (session_id) REFERENCES public.sessions(id) ON DELETE CASCADE;

ALTER TABLE public.session_likes ADD CONSTRAINT session_likes_session_id_fkey 
    FOREIGN KEY (session_id) REFERENCES public.sessions(id) ON DELETE CASCADE;

ALTER TABLE public.session_kooks ADD CONSTRAINT session_kooks_session_id_fkey 
    FOREIGN KEY (session_id) REFERENCES public.sessions(id) ON DELETE CASCADE;

ALTER TABLE public.session_comments ADD CONSTRAINT session_comments_session_id_fkey 
    FOREIGN KEY (session_id) REFERENCES public.sessions(id) ON DELETE CASCADE;

ALTER TABLE public.favorite_spots ADD CONSTRAINT favorite_spots_spot_id_fkey 
    FOREIGN KEY (spot_id) REFERENCES public.spots(id) ON DELETE CASCADE;

ALTER TABLE public.forecast_comments ADD CONSTRAINT forecast_comments_spot_id_fkey 
    FOREIGN KEY (spot_id) REFERENCES public.spots(id) ON DELETE CASCADE;

ALTER TABLE public.forecast_comments ADD CONSTRAINT forecast_comments_parent_id_fkey 
    FOREIGN KEY (parent_id) REFERENCES public.forecast_comments(id) ON DELETE CASCADE;

ALTER TABLE public.forecast_comment_likes ADD CONSTRAINT forecast_comment_likes_comment_id_fkey 
    FOREIGN KEY (comment_id) REFERENCES public.forecast_comments(id) ON DELETE CASCADE;

ALTER TABLE public.forecast_comment_kooks ADD CONSTRAINT forecast_comment_kooks_comment_id_fkey 
    FOREIGN KEY (comment_id) REFERENCES public.forecast_comments(id) ON DELETE CASCADE;

-- ============================================
-- 4. FUNCTIONS
-- ============================================

-- Update timestamp function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

-- Handle new user function (for Supabase Auth)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    INSERT INTO public.profiles (user_id, display_name)
    VALUES (NEW.id, NEW.raw_user_meta_data ->> 'display_name');
    RETURN NEW;
END;
$$;

-- Has role function (for authorization)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.user_roles
        WHERE user_id = _user_id
          AND role = _role
    )
$$;

-- ============================================
-- 5. TRIGGERS
-- ============================================

CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_boards_updated_at
    BEFORE UPDATE ON public.boards
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_sessions_updated_at
    BEFORE UPDATE ON public.sessions
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- 6. ROW LEVEL SECURITY
-- ============================================

-- PROFILES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can view other profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);

-- USER_ROLES
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all roles" ON public.user_roles FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can insert roles" ON public.user_roles FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete roles" ON public.user_roles FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

-- SPOTS
ALTER TABLE public.spots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view spots" ON public.spots FOR SELECT USING (true);

-- BOARDS
ALTER TABLE public.boards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own boards" ON public.boards FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own boards" ON public.boards FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own boards" ON public.boards FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own boards" ON public.boards FOR DELETE USING (auth.uid() = user_id);

-- SESSIONS
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own sessions" ON public.sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can view public sessions" ON public.sessions FOR SELECT USING (is_public = true);
CREATE POLICY "Users can insert their own sessions" ON public.sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own sessions" ON public.sessions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own sessions" ON public.sessions FOR DELETE USING (auth.uid() = user_id);

-- SESSION_MEDIA
ALTER TABLE public.session_media ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view media on public sessions" ON public.session_media FOR SELECT 
    USING (EXISTS (SELECT 1 FROM sessions s WHERE s.id = session_media.session_id AND (s.is_public = true OR s.user_id = auth.uid())));
CREATE POLICY "Users can add media to own sessions" ON public.session_media FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own media" ON public.session_media FOR DELETE USING (auth.uid() = user_id);

-- SESSION_SWELL_DATA
ALTER TABLE public.session_swell_data ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view swell data for public sessions" ON public.session_swell_data FOR SELECT 
    USING (EXISTS (SELECT 1 FROM sessions s WHERE s.id = session_swell_data.session_id AND (s.is_public = true OR s.user_id = auth.uid())));
CREATE POLICY "System can insert swell data" ON public.session_swell_data FOR INSERT WITH CHECK (true);

-- SESSION_LIKES
ALTER TABLE public.session_likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view likes" ON public.session_likes FOR SELECT USING (true);
CREATE POLICY "Users can like sessions" ON public.session_likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can unlike" ON public.session_likes FOR DELETE USING (auth.uid() = user_id);

-- SESSION_KOOKS
ALTER TABLE public.session_kooks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view all kooks" ON public.session_kooks FOR SELECT USING (true);
CREATE POLICY "Users can add their own kook" ON public.session_kooks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can remove their own kook" ON public.session_kooks FOR DELETE USING (auth.uid() = user_id);

-- SESSION_COMMENTS
ALTER TABLE public.session_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view comments" ON public.session_comments FOR SELECT USING (true);
CREATE POLICY "Users can comment" ON public.session_comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own comments" ON public.session_comments FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Admins can delete any comment" ON public.session_comments FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

-- FOLLOWS
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view follows" ON public.follows FOR SELECT USING (true);
CREATE POLICY "Users can follow others" ON public.follows FOR INSERT WITH CHECK (auth.uid() = follower_id);
CREATE POLICY "Users can unfollow" ON public.follows FOR DELETE USING (auth.uid() = follower_id);

-- FAVORITE_SPOTS
ALTER TABLE public.favorite_spots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own favorite spots" ON public.favorite_spots FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can add their own favorite spots" ON public.favorite_spots FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own favorite spots" ON public.favorite_spots FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own favorite spots" ON public.favorite_spots FOR DELETE USING (auth.uid() = user_id);

-- SAVED_LOCATIONS
ALTER TABLE public.saved_locations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own saved locations" ON public.saved_locations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own saved locations" ON public.saved_locations FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own saved locations" ON public.saved_locations FOR DELETE USING (auth.uid() = user_id);

-- FORECAST_COMMENTS
ALTER TABLE public.forecast_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view forecast comments" ON public.forecast_comments FOR SELECT USING (true);
CREATE POLICY "Users can add forecast comments" ON public.forecast_comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own forecast comments" ON public.forecast_comments FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Admins can delete any forecast comment" ON public.forecast_comments FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

-- FORECAST_COMMENT_LIKES
ALTER TABLE public.forecast_comment_likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view forecast comment likes" ON public.forecast_comment_likes FOR SELECT USING (true);
CREATE POLICY "Users can like forecast comments" ON public.forecast_comment_likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can unlike forecast comments" ON public.forecast_comment_likes FOR DELETE USING (auth.uid() = user_id);

-- FORECAST_COMMENT_KOOKS
ALTER TABLE public.forecast_comment_kooks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view forecast comment kooks" ON public.forecast_comment_kooks FOR SELECT USING (true);
CREATE POLICY "Users can kook forecast comments" ON public.forecast_comment_kooks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can unkook forecast comments" ON public.forecast_comment_kooks FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- 7. STORAGE BUCKETS (Supabase-specific)
-- ============================================
-- For self-hosted, use MinIO or S3 instead

INSERT INTO storage.buckets (id, name, public) VALUES ('session-media', 'session-media', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('board-photos', 'board-photos', true);

-- Storage policies
CREATE POLICY "Anyone can view session media" ON storage.objects FOR SELECT USING (bucket_id = 'session-media');
CREATE POLICY "Authenticated users can upload session media" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'session-media' AND auth.role() = 'authenticated');
CREATE POLICY "Users can delete their own session media" ON storage.objects FOR DELETE USING (bucket_id = 'session-media' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Anyone can view avatars" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "Authenticated users can upload avatars" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.role() = 'authenticated');
CREATE POLICY "Users can update their own avatar" ON storage.objects FOR UPDATE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can delete their own avatar" ON storage.objects FOR DELETE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Anyone can view board photos" ON storage.objects FOR SELECT USING (bucket_id = 'board-photos');
CREATE POLICY "Authenticated users can upload board photos" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'board-photos' AND auth.role() = 'authenticated');
CREATE POLICY "Users can delete their own board photos" ON storage.objects FOR DELETE USING (bucket_id = 'board-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
