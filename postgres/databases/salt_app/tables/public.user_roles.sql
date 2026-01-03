-- User roles table - Authorization roles
CREATE TABLE public.user_roles (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    role app_role NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, role),
    CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Create index on user_id for faster role lookups
CREATE INDEX idx_user_roles_user_id ON public.user_roles(user_id);

-- Create index on role for admin queries
CREATE INDEX idx_user_roles_role ON public.user_roles(role);

COMMENT ON TABLE public.user_roles IS 'User authorization roles (admin, moderator, user)';
COMMENT ON COLUMN public.user_roles.role IS 'Role type from app_role enum';
