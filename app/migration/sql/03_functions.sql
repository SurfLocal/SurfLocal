-- ============================================
-- DATABASE FUNCTIONS
-- Run after tables are created
-- ============================================

-- ----------------------------------------
-- UPDATE TIMESTAMP FUNCTION
-- Automatically updates updated_at column
-- ----------------------------------------
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

-- ----------------------------------------
-- HANDLE NEW USER FUNCTION
-- Creates profile when new user signs up
-- For Supabase Auth integration
-- ----------------------------------------
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

-- ----------------------------------------
-- HAS_ROLE FUNCTION
-- Checks if user has a specific role
-- Security definer to bypass RLS
-- ----------------------------------------
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

-- ----------------------------------------
-- GET USER ID FROM EMAIL (Helper)
-- Useful for admin scripts
-- ----------------------------------------
CREATE OR REPLACE FUNCTION public.get_user_id_by_email(_email TEXT)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
    SELECT id FROM auth.users WHERE email = _email LIMIT 1
$$;
