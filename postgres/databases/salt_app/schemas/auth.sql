-- Auth schema for authentication-related tables
-- Separates auth concerns from application data

CREATE SCHEMA IF NOT EXISTS auth;

COMMENT ON SCHEMA auth IS 'Authentication and user management schema';
