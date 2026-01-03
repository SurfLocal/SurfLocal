-- Create database if it doesn't exist (idempotent)
SELECT 'CREATE DATABASE salt_app'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'salt_app')\gexec
