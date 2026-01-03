-- Application role enum for user permissions
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

COMMENT ON TYPE public.app_role IS 'User authorization levels for the Salt application';
