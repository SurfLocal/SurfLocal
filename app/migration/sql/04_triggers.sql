-- ============================================
-- TRIGGERS
-- Run after functions are created
-- ============================================

-- ----------------------------------------
-- AUTO-UPDATE TIMESTAMPS
-- ----------------------------------------

-- Profiles updated_at trigger
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Boards updated_at trigger
CREATE TRIGGER update_boards_updated_at
    BEFORE UPDATE ON public.boards
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Sessions updated_at trigger
CREATE TRIGGER update_sessions_updated_at
    BEFORE UPDATE ON public.sessions
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- ----------------------------------------
-- NEW USER PROFILE CREATION
-- For Supabase Auth integration
-- Creates profile automatically on signup
-- ----------------------------------------
-- Note: This trigger is on auth.users which is managed by Supabase
-- For self-hosted, you'll need to adapt this to your auth system

-- CREATE TRIGGER on_auth_user_created
--     AFTER INSERT ON auth.users
--     FOR EACH ROW
--     EXECUTE FUNCTION public.handle_new_user();
