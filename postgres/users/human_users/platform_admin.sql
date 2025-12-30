-- Create user if it doesn't exist (idempotent)
-- Password should be set via Ansible vault variable: {{ platform_admin_password }}
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'platform_admin') THEN
        CREATE USER platform_admin WITH LOGIN SUPERUSER PASSWORD '{{ platform_admin_password }}';
    END IF;
END
$$;
