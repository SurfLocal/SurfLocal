-- Forecast comment likes table - Likes on forecast comments
CREATE TABLE public.forecast_comment_likes (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    comment_id UUID NOT NULL,
    user_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (comment_id, user_id),
    CONSTRAINT forecast_comment_likes_comment_id_fkey FOREIGN KEY (comment_id) REFERENCES public.forecast_comments(id) ON DELETE CASCADE,
    CONSTRAINT forecast_comment_likes_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Create index on comment_id for comment like queries
CREATE INDEX idx_forecast_comment_likes_comment_id ON public.forecast_comment_likes(comment_id);

-- Create index on user_id for user like queries
CREATE INDEX idx_forecast_comment_likes_user_id ON public.forecast_comment_likes(user_id);

COMMENT ON TABLE public.forecast_comment_likes IS 'Like reactions on forecast comments';
