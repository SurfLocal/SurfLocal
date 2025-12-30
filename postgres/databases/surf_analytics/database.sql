-- Create database if it doesn't exist (idempotent)
SELECT 'CREATE DATABASE surf_analytics'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'surf_analytics')\gexec
