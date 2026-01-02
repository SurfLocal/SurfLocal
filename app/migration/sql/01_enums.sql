-- ============================================
-- ENUMS
-- Run this first before creating tables
-- ============================================

-- Application role enum for user permissions
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');
