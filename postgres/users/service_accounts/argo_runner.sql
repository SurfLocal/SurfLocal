-- Create user if it doesn't exist (idempotent)
-- Password should be set via Ansible vault variable: {{ argo_runner_password }}
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'argo_runner') THEN
        CREATE USER argo_runner WITH PASSWORD '{{ argo_runner_password }}';
    END IF;
END
$$;

-- Grant roles (idempotent - GRANT is safe to run multiple times)
GRANT argo_read TO argo_runner;
GRANT argo_write TO argo_runner;
