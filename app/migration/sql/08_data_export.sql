-- ============================================
-- DATA EXPORT QUERIES
-- Use these to export your existing data
-- ============================================

-- Note: Run these queries against your Supabase database
-- to export data as CSV or JSON for import into your new database

-- ----------------------------------------
-- EXPORT SPOTS
-- ----------------------------------------
-- COPY (SELECT * FROM public.spots) TO '/tmp/spots.csv' WITH CSV HEADER;
-- Or use: \copy public.spots TO 'spots.csv' WITH CSV HEADER

-- ----------------------------------------
-- EXPORT PROFILES (without user_id for privacy)
-- ----------------------------------------
-- SELECT id, display_name, bio, avatar_url, home_break, years_surfing,
--        longest_streak, total_shakas_received, total_kooks_received,
--        created_at, updated_at
-- FROM public.profiles;

-- ----------------------------------------
-- EXPORT SESSIONS
-- ----------------------------------------
-- SELECT * FROM public.sessions;

-- ----------------------------------------
-- EXPORT BOARDS
-- ----------------------------------------
-- SELECT * FROM public.boards;

-- ----------------------------------------
-- FULL EXPORT SCRIPT
-- ----------------------------------------
-- Run this in psql connected to your Supabase database:

-- \copy public.spots TO 'export/spots.csv' WITH CSV HEADER
-- \copy public.profiles TO 'export/profiles.csv' WITH CSV HEADER
-- \copy public.boards TO 'export/boards.csv' WITH CSV HEADER
-- \copy public.sessions TO 'export/sessions.csv' WITH CSV HEADER
-- \copy public.session_media TO 'export/session_media.csv' WITH CSV HEADER
-- \copy public.session_likes TO 'export/session_likes.csv' WITH CSV HEADER
-- \copy public.session_kooks TO 'export/session_kooks.csv' WITH CSV HEADER
-- \copy public.session_comments TO 'export/session_comments.csv' WITH CSV HEADER
-- \copy public.follows TO 'export/follows.csv' WITH CSV HEADER
-- \copy public.favorite_spots TO 'export/favorite_spots.csv' WITH CSV HEADER
-- \copy public.saved_locations TO 'export/saved_locations.csv' WITH CSV HEADER
-- \copy public.forecast_comments TO 'export/forecast_comments.csv' WITH CSV HEADER
-- \copy public.user_roles TO 'export/user_roles.csv' WITH CSV HEADER

-- ----------------------------------------
-- JSON EXPORT (for programmatic use)
-- ----------------------------------------
-- SELECT json_agg(spots) FROM public.spots;
-- SELECT json_agg(profiles) FROM public.profiles;
-- etc.
