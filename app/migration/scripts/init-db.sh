#!/bin/bash
# Database initialization script
# This runs automatically when the postgres container starts for the first time

set -e

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    -- Create extensions
    CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
    CREATE EXTENSION IF NOT EXISTS "pgcrypto";
    
    -- Run SQL files in order
    \i /docker-entrypoint-initdb.d/sql/01_enums.sql
    \i /docker-entrypoint-initdb.d/sql/02_tables.sql
    \i /docker-entrypoint-initdb.d/sql/03_functions.sql
    \i /docker-entrypoint-initdb.d/sql/04_triggers.sql
    
    -- Note: RLS policies require auth.uid() function which is Supabase-specific
    -- You'll need to implement your own auth system
    
    RAISE NOTICE 'Database initialization complete!';
EOSQL
