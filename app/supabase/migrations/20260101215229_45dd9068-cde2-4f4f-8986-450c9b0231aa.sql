-- Drop existing constraints if they exist and recreate with ON DELETE CASCADE

-- profiles
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_user_id_fkey;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- sessions
ALTER TABLE public.sessions DROP CONSTRAINT IF EXISTS sessions_user_id_fkey;
ALTER TABLE public.sessions ADD CONSTRAINT sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- boards
ALTER TABLE public.boards DROP CONSTRAINT IF EXISTS boards_user_id_fkey;
ALTER TABLE public.boards ADD CONSTRAINT boards_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- saved_locations
ALTER TABLE public.saved_locations DROP CONSTRAINT IF EXISTS saved_locations_user_id_fkey;
ALTER TABLE public.saved_locations ADD CONSTRAINT saved_locations_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- session_likes
ALTER TABLE public.session_likes DROP CONSTRAINT IF EXISTS session_likes_user_id_fkey;
ALTER TABLE public.session_likes ADD CONSTRAINT session_likes_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- session_kooks
ALTER TABLE public.session_kooks DROP CONSTRAINT IF EXISTS session_kooks_user_id_fkey;
ALTER TABLE public.session_kooks ADD CONSTRAINT session_kooks_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- session_comments
ALTER TABLE public.session_comments DROP CONSTRAINT IF EXISTS session_comments_user_id_fkey;
ALTER TABLE public.session_comments ADD CONSTRAINT session_comments_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- session_media
ALTER TABLE public.session_media DROP CONSTRAINT IF EXISTS session_media_user_id_fkey;
ALTER TABLE public.session_media ADD CONSTRAINT session_media_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- forecast_comments
ALTER TABLE public.forecast_comments DROP CONSTRAINT IF EXISTS forecast_comments_user_id_fkey;
ALTER TABLE public.forecast_comments ADD CONSTRAINT forecast_comments_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- forecast_comment_likes
ALTER TABLE public.forecast_comment_likes DROP CONSTRAINT IF EXISTS forecast_comment_likes_user_id_fkey;
ALTER TABLE public.forecast_comment_likes ADD CONSTRAINT forecast_comment_likes_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- forecast_comment_kooks
ALTER TABLE public.forecast_comment_kooks DROP CONSTRAINT IF EXISTS forecast_comment_kooks_user_id_fkey;
ALTER TABLE public.forecast_comment_kooks ADD CONSTRAINT forecast_comment_kooks_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- follows (two foreign keys)
ALTER TABLE public.follows DROP CONSTRAINT IF EXISTS follows_follower_id_fkey;
ALTER TABLE public.follows ADD CONSTRAINT follows_follower_id_fkey FOREIGN KEY (follower_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.follows DROP CONSTRAINT IF EXISTS follows_following_id_fkey;
ALTER TABLE public.follows ADD CONSTRAINT follows_following_id_fkey FOREIGN KEY (following_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- user_roles
ALTER TABLE public.user_roles DROP CONSTRAINT IF EXISTS user_roles_user_id_fkey;
ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;