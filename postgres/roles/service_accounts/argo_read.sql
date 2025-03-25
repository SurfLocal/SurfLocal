CREATE ROLE argo_read;

-- Grant CONNECT privilege to the role on the database
GRANT CONNECT ON DATABASE surf_analytics TO argo_read;
\c surf_analytics;

GRANT USAGE ON SCHEMA reference TO argo_read;

GRANT SELECT ON ALL TABLES IN SCHEMA reference TO argo_read;

ALTER DEFAULT PRIVILEGES IN SCHEMA reference GRANT SELECT ON TABLES TO argo_read;

-- Ensure role is inheritable
ALTER ROLE argo_read INHERIT;
