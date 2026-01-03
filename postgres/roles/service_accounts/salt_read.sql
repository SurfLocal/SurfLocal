-- Create role if it doesn't exist (idempotent)
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'salt_read') THEN
        CREATE ROLE salt_read;
    END IF;
END
$$;

-- Grant CONNECT privilege to the role on the database
GRANT CONNECT ON DATABASE salt_app TO salt_read;

-- Grant USAGE on schemas
GRANT USAGE ON SCHEMA public TO salt_read;
GRANT USAGE ON SCHEMA auth TO salt_read;

-- Grant SELECT on all tables in public schema
GRANT SELECT ON ALL TABLES IN SCHEMA public TO salt_read;

-- Grant SELECT on all tables in auth schema
GRANT SELECT ON ALL TABLES IN SCHEMA auth TO salt_read;

-- Grant SELECT on future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO salt_read;
ALTER DEFAULT PRIVILEGES IN SCHEMA auth GRANT SELECT ON TABLES TO salt_read;

-- Ensure role is inheritable
ALTER ROLE salt_read INHERIT;

-- Grant read access to surf_analytics database schemas
-- This allows the Salt API to query live swell/wind data
GRANT CONNECT ON DATABASE surf_analytics TO salt_read;
GRANT USAGE ON SCHEMA reference TO salt_read;
GRANT USAGE ON SCHEMA ingested TO salt_read;
GRANT SELECT ON ALL TABLES IN SCHEMA reference TO salt_read;
GRANT SELECT ON ALL TABLES IN SCHEMA ingested TO salt_read;
ALTER DEFAULT PRIVILEGES IN SCHEMA reference GRANT SELECT ON TABLES TO salt_read;
ALTER DEFAULT PRIVILEGES IN SCHEMA ingested GRANT SELECT ON TABLES TO salt_read;

COMMENT ON ROLE salt_read IS 'Read-only access to salt_app and surf_analytics databases for service accounts';
