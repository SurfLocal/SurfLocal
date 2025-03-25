CREATE ROLE argo_write;

-- Grant CONNECT privilege to the role on the database
GRANT CONNECT ON DATABASE surf_analytics TO argo_write;
\c surf_analytics;

GRANT USAGE ON SCHEMA ingested TO argo_write;

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA ingested TO argo_write;

ALTER DEFAULT PRIVILEGES IN SCHEMA ingested GRANT SELECT ON TABLES TO argo_write;

-- Ensure role is inheritable
ALTER ROLE argo_write INHERIT;
