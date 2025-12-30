-- Create role if it doesn't exist (idempotent)
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'argo_read') THEN
        CREATE ROLE argo_read;
    END IF;
END
$$;

-- Grant CONNECT privilege to the role on the database
GRANT CONNECT ON DATABASE surf_analytics TO argo_read;

GRANT USAGE ON SCHEMA reference TO argo_read;

GRANT SELECT ON ALL TABLES IN SCHEMA reference TO argo_read;

ALTER DEFAULT PRIVILEGES IN SCHEMA reference GRANT SELECT ON TABLES TO argo_read;

-- Ensure role is inheritable
ALTER ROLE argo_read INHERIT;
