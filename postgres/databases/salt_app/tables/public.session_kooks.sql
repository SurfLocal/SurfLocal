-- Session kooks table - Kook reactions on sessions
CREATE TABLE public.session_kooks (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id UUID NOT NULL,
    user_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (session_id, user_id),
    CONSTRAINT session_kooks_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.sessions(id) ON DELETE CASCADE,
    CONSTRAINT session_kooks_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Create index on session_id for session kook queries
CREATE INDEX idx_session_kooks_session_id ON public.session_kooks(session_id);

-- Create index on user_id for user kook queries
CREATE INDEX idx_session_kooks_user_id ON public.session_kooks(user_id);

COMMENT ON TABLE public.session_kooks IS 'Kook reactions on surf sessions (negative reaction)';
