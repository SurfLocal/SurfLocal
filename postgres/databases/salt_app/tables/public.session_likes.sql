-- Session likes table - Shaka/likes on sessions
CREATE TABLE public.session_likes (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id UUID NOT NULL,
    user_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (session_id, user_id),
    CONSTRAINT session_likes_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.sessions(id) ON DELETE CASCADE,
    CONSTRAINT session_likes_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Create index on session_id for session like queries
CREATE INDEX idx_session_likes_session_id ON public.session_likes(session_id);

-- Create index on user_id for user like queries
CREATE INDEX idx_session_likes_user_id ON public.session_likes(user_id);

COMMENT ON TABLE public.session_likes IS 'Shaka/like reactions on surf sessions';
