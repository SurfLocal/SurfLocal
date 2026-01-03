-- Create role if it doesn't exist (idempotent)
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'salt_write') THEN
        CREATE ROLE salt_write;
    END IF;
END
$$;

-- Grant CONNECT privilege to the role on the database
GRANT CONNECT ON DATABASE salt_app TO salt_write;

-- Grant USAGE on schemas
GRANT USAGE ON SCHEMA public TO salt_write;
GRANT USAGE ON SCHEMA auth TO salt_write;

-- Grant full CRUD on all tables in public schema
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO salt_write;

-- Grant full CRUD on all tables in auth schema
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA auth TO salt_write;

-- Grant usage on sequences (for auto-increment/serial columns)
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO salt_write;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA auth TO salt_write;

-- Grant permissions on future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO salt_write;
ALTER DEFAULT PRIVILEGES IN SCHEMA auth GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO salt_write;

-- Grant permissions on future sequences
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO salt_write;
ALTER DEFAULT PRIVILEGES IN SCHEMA auth GRANT USAGE, SELECT ON SEQUENCES TO salt_write;

-- Ensure role is inheritable
ALTER ROLE salt_write INHERIT;

COMMENT ON ROLE salt_write IS 'Read/write access to salt_app database for service accounts';
