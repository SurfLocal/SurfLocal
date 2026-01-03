-- Create admin user if it doesn't exist (idempotent)
-- Password should be set via Ansible vault variable: {{ salt_admin_password }}
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'salt_admin') THEN
        CREATE USER salt_admin WITH PASSWORD '{{ salt_admin_password }}';
    END IF;
END
$$;

-- Grant superuser privileges on salt_app database
GRANT ALL PRIVILEGES ON DATABASE salt_app TO salt_admin;

-- Grant all privileges on schemas
GRANT ALL PRIVILEGES ON SCHEMA public TO salt_admin;
GRANT ALL PRIVILEGES ON SCHEMA auth TO salt_admin;

-- Grant all privileges on all tables
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO salt_admin;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA auth TO salt_admin;

-- Grant all privileges on all sequences
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO salt_admin;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA auth TO salt_admin;

-- Grant privileges on future objects
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL PRIVILEGES ON TABLES TO salt_admin;
ALTER DEFAULT PRIVILEGES IN SCHEMA auth GRANT ALL PRIVILEGES ON TABLES TO salt_admin;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL PRIVILEGES ON SEQUENCES TO salt_admin;
ALTER DEFAULT PRIVILEGES IN SCHEMA auth GRANT ALL PRIVILEGES ON SEQUENCES TO salt_admin;

COMMENT ON ROLE salt_admin IS 'Human administrator account with full privileges on salt_app database';
