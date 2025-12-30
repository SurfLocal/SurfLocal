-- Create role if it doesn't exist (idempotent)
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'argo_write') THEN
        CREATE ROLE argo_write;
    END IF;
END
$$;

-- Grant CONNECT privilege to the role on the database
GRANT CONNECT ON DATABASE surf_analytics TO argo_write;

GRANT USAGE ON SCHEMA ingested TO argo_write;

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA ingested TO argo_write;

ALTER DEFAULT PRIVILEGES IN SCHEMA ingested GRANT SELECT ON TABLES TO argo_write;

-- Ensure role is inheritable
ALTER ROLE argo_write INHERIT;
