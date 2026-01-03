-- Session comments table - Comments on sessions
CREATE TABLE public.session_comments (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id UUID NOT NULL,
    user_id UUID NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    CONSTRAINT session_comments_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.sessions(id) ON DELETE CASCADE,
    CONSTRAINT session_comments_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Create index on session_id for session comment queries
CREATE INDEX idx_session_comments_session_id ON public.session_comments(session_id);

-- Create index on user_id for user comment queries
CREATE INDEX idx_session_comments_user_id ON public.session_comments(user_id);

-- Create index on created_at for chronological queries
CREATE INDEX idx_session_comments_created_at ON public.session_comments(created_at DESC);

COMMENT ON TABLE public.session_comments IS 'User comments on surf sessions';
