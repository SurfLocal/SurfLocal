-- Public schema is created by default in PostgreSQL
-- This file ensures it exists and sets proper permissions

-- Ensure public schema exists
CREATE SCHEMA IF NOT EXISTS public;

-- Grant usage on public schema
GRANT USAGE ON SCHEMA public TO PUBLIC;
GRANT CREATE ON SCHEMA public TO PUBLIC;

COMMENT ON SCHEMA public IS 'Standard public schema for Salt application data';
