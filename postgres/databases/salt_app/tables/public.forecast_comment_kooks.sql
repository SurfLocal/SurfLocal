-- Forecast comment kooks table - Kook reactions on forecast comments
CREATE TABLE public.forecast_comment_kooks (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    comment_id UUID NOT NULL,
    user_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (comment_id, user_id),
    CONSTRAINT forecast_comment_kooks_comment_id_fkey FOREIGN KEY (comment_id) REFERENCES public.forecast_comments(id) ON DELETE CASCADE,
    CONSTRAINT forecast_comment_kooks_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Create index on comment_id for comment kook queries
CREATE INDEX idx_forecast_comment_kooks_comment_id ON public.forecast_comment_kooks(comment_id);

-- Create index on user_id for user kook queries
CREATE INDEX idx_forecast_comment_kooks_user_id ON public.forecast_comment_kooks(user_id);

COMMENT ON TABLE public.forecast_comment_kooks IS 'Kook reactions on forecast comments (negative reaction)';
