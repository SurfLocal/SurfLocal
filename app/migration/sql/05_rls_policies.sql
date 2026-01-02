-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- Run after tables are created
-- ============================================

-- ----------------------------------------
-- PROFILES TABLE RLS
-- ----------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile"
    ON public.profiles FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can view other profiles"
    ON public.profiles FOR SELECT
    USING (true);

CREATE POLICY "Users can insert their own profile"
    ON public.profiles FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = user_id);

-- ----------------------------------------
-- USER_ROLES TABLE RLS
-- ----------------------------------------
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own roles"
    ON public.user_roles FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
    ON public.user_roles FOR SELECT
    USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert roles"
    ON public.user_roles FOR INSERT
    WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete roles"
    ON public.user_roles FOR DELETE
    USING (has_role(auth.uid(), 'admin'::app_role));

-- ----------------------------------------
-- SPOTS TABLE RLS
-- ----------------------------------------
ALTER TABLE public.spots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view spots"
    ON public.spots FOR SELECT
    USING (true);

-- ----------------------------------------
-- BOARDS TABLE RLS
-- ----------------------------------------
ALTER TABLE public.boards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own boards"
    ON public.boards FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own boards"
    ON public.boards FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own boards"
    ON public.boards FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own boards"
    ON public.boards FOR DELETE
    USING (auth.uid() = user_id);

-- ----------------------------------------
-- SESSIONS TABLE RLS
-- ----------------------------------------
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own sessions"
    ON public.sessions FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can view public sessions"
    ON public.sessions FOR SELECT
    USING (is_public = true);

CREATE POLICY "Users can insert their own sessions"
    ON public.sessions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sessions"
    ON public.sessions FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own sessions"
    ON public.sessions FOR DELETE
    USING (auth.uid() = user_id);

-- ----------------------------------------
-- SESSION_MEDIA TABLE RLS
-- ----------------------------------------
ALTER TABLE public.session_media ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view media on public sessions"
    ON public.session_media FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM sessions s
        WHERE s.id = session_media.session_id
        AND (s.is_public = true OR s.user_id = auth.uid())
    ));

CREATE POLICY "Users can add media to own sessions"
    ON public.session_media FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own media"
    ON public.session_media FOR DELETE
    USING (auth.uid() = user_id);

-- ----------------------------------------
-- SESSION_SWELL_DATA TABLE RLS
-- ----------------------------------------
ALTER TABLE public.session_swell_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view swell data for public sessions"
    ON public.session_swell_data FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM sessions s
        WHERE s.id = session_swell_data.session_id
        AND (s.is_public = true OR s.user_id = auth.uid())
    ));

CREATE POLICY "System can insert swell data"
    ON public.session_swell_data FOR INSERT
    WITH CHECK (true);

-- ----------------------------------------
-- SESSION_LIKES TABLE RLS
-- ----------------------------------------
ALTER TABLE public.session_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view likes"
    ON public.session_likes FOR SELECT
    USING (true);

CREATE POLICY "Users can like sessions"
    ON public.session_likes FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unlike"
    ON public.session_likes FOR DELETE
    USING (auth.uid() = user_id);

-- ----------------------------------------
-- SESSION_KOOKS TABLE RLS
-- ----------------------------------------
ALTER TABLE public.session_kooks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all kooks"
    ON public.session_kooks FOR SELECT
    USING (true);

CREATE POLICY "Users can add their own kook"
    ON public.session_kooks FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove their own kook"
    ON public.session_kooks FOR DELETE
    USING (auth.uid() = user_id);

-- ----------------------------------------
-- SESSION_COMMENTS TABLE RLS
-- ----------------------------------------
ALTER TABLE public.session_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view comments"
    ON public.session_comments FOR SELECT
    USING (true);

CREATE POLICY "Users can comment"
    ON public.session_comments FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own comments"
    ON public.session_comments FOR DELETE
    USING (auth.uid() = user_id);

CREATE POLICY "Admins can delete any comment"
    ON public.session_comments FOR DELETE
    USING (has_role(auth.uid(), 'admin'::app_role));

-- ----------------------------------------
-- FOLLOWS TABLE RLS
-- ----------------------------------------
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view follows"
    ON public.follows FOR SELECT
    USING (true);

CREATE POLICY "Users can follow others"
    ON public.follows FOR INSERT
    WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "Users can unfollow"
    ON public.follows FOR DELETE
    USING (auth.uid() = follower_id);

-- ----------------------------------------
-- FAVORITE_SPOTS TABLE RLS
-- ----------------------------------------
ALTER TABLE public.favorite_spots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own favorite spots"
    ON public.favorite_spots FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can add their own favorite spots"
    ON public.favorite_spots FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own favorite spots"
    ON public.favorite_spots FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own favorite spots"
    ON public.favorite_spots FOR DELETE
    USING (auth.uid() = user_id);

-- ----------------------------------------
-- SAVED_LOCATIONS TABLE RLS
-- ----------------------------------------
ALTER TABLE public.saved_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own saved locations"
    ON public.saved_locations FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own saved locations"
    ON public.saved_locations FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own saved locations"
    ON public.saved_locations FOR DELETE
    USING (auth.uid() = user_id);

-- ----------------------------------------
-- FORECAST_COMMENTS TABLE RLS
-- ----------------------------------------
ALTER TABLE public.forecast_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view forecast comments"
    ON public.forecast_comments FOR SELECT
    USING (true);

CREATE POLICY "Users can add forecast comments"
    ON public.forecast_comments FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own forecast comments"
    ON public.forecast_comments FOR DELETE
    USING (auth.uid() = user_id);

CREATE POLICY "Admins can delete any forecast comment"
    ON public.forecast_comments FOR DELETE
    USING (has_role(auth.uid(), 'admin'::app_role));

-- ----------------------------------------
-- FORECAST_COMMENT_LIKES TABLE RLS
-- ----------------------------------------
ALTER TABLE public.forecast_comment_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view forecast comment likes"
    ON public.forecast_comment_likes FOR SELECT
    USING (true);

CREATE POLICY "Users can like forecast comments"
    ON public.forecast_comment_likes FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unlike forecast comments"
    ON public.forecast_comment_likes FOR DELETE
    USING (auth.uid() = user_id);

-- ----------------------------------------
-- FORECAST_COMMENT_KOOKS TABLE RLS
-- ----------------------------------------
ALTER TABLE public.forecast_comment_kooks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view forecast comment kooks"
    ON public.forecast_comment_kooks FOR SELECT
    USING (true);

CREATE POLICY "Users can kook forecast comments"
    ON public.forecast_comment_kooks FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unkook forecast comments"
    ON public.forecast_comment_kooks FOR DELETE
    USING (auth.uid() = user_id);
