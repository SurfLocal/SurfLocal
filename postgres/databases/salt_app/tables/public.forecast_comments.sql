-- Forecast comments table - Comments on spot forecasts
CREATE TABLE public.forecast_comments (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    spot_id UUID NOT NULL,
    user_id UUID NOT NULL,
    content TEXT NOT NULL,
    parent_id UUID,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    CONSTRAINT forecast_comments_spot_id_fkey FOREIGN KEY (spot_id) REFERENCES public.spots(id) ON DELETE CASCADE,
    CONSTRAINT forecast_comments_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
    CONSTRAINT forecast_comments_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.forecast_comments(id) ON DELETE CASCADE
);

-- Create index on spot_id for spot forecast queries
CREATE INDEX idx_forecast_comments_spot_id ON public.forecast_comments(spot_id);

-- Create index on user_id for user comment queries
CREATE INDEX idx_forecast_comments_user_id ON public.forecast_comments(user_id);

-- Create index on parent_id for threaded comments
CREATE INDEX idx_forecast_comments_parent_id ON public.forecast_comments(parent_id);

-- Create index on created_at for chronological queries
CREATE INDEX idx_forecast_comments_created_at ON public.forecast_comments(created_at DESC);

COMMENT ON TABLE public.forecast_comments IS 'User comments on surf spot forecasts with threading support';
COMMENT ON COLUMN public.forecast_comments.parent_id IS 'Parent comment ID for threaded replies';
