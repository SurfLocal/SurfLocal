-- Session media table - Photos/videos attached to sessions
CREATE TABLE public.session_media (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id UUID NOT NULL,
    user_id UUID NOT NULL,
    url TEXT NOT NULL,
    media_type TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    CONSTRAINT session_media_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.sessions(id) ON DELETE CASCADE,
    CONSTRAINT session_media_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Create index on session_id for session media queries
CREATE INDEX idx_session_media_session_id ON public.session_media(session_id);

-- Create index on user_id for user media queries
CREATE INDEX idx_session_media_user_id ON public.session_media(user_id);

COMMENT ON TABLE public.session_media IS 'Photos and videos attached to surf sessions';
COMMENT ON COLUMN public.session_media.url IS 'URL to media file in MinIO storage (bucket: session-media)';
COMMENT ON COLUMN public.session_media.media_type IS 'Type of media (image/jpeg, video/mp4, etc.)';
