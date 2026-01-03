-- Create user if it doesn't exist (idempotent)
-- Password should be set via Ansible vault variable: {{ salt_app_password }}
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'salt_app') THEN
        CREATE USER salt_app WITH PASSWORD '{{ salt_app_password }}';
    END IF;
END
$$;

-- Grant roles (idempotent - GRANT is safe to run multiple times)
GRANT salt_read TO salt_app;
GRANT salt_write TO salt_app;

COMMENT ON ROLE salt_app IS 'Service account for Salt backend API with read/write access';
