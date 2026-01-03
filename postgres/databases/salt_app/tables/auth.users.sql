-- Users table for authentication
-- Replaces Supabase auth.users
CREATE TABLE auth.users (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    email_confirmed BOOLEAN NOT NULL DEFAULT false,
    confirmation_token TEXT,
    reset_token TEXT,
    reset_token_expires_at TIMESTAMP WITH TIME ZONE,
    last_sign_in_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index on email for faster lookups
CREATE INDEX idx_users_email ON auth.users(email);

-- Create index on confirmation_token for email verification
CREATE INDEX idx_users_confirmation_token ON auth.users(confirmation_token) WHERE confirmation_token IS NOT NULL;

-- Create index on reset_token for password resets
CREATE INDEX idx_users_reset_token ON auth.users(reset_token) WHERE reset_token IS NOT NULL;

COMMENT ON TABLE auth.users IS 'User authentication credentials and account information';
COMMENT ON COLUMN auth.users.password_hash IS 'Bcrypt hashed password';
COMMENT ON COLUMN auth.users.email_confirmed IS 'Whether user has verified their email address';
COMMENT ON COLUMN auth.users.confirmation_token IS 'Token for email verification';
COMMENT ON COLUMN auth.users.reset_token IS 'Token for password reset';
