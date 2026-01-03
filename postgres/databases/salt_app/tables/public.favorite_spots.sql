-- Favorite spots table - User's favorite surf spots
CREATE TABLE public.favorite_spots (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    spot_id UUID NOT NULL,
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, spot_id),
    CONSTRAINT favorite_spots_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
    CONSTRAINT favorite_spots_spot_id_fkey FOREIGN KEY (spot_id) REFERENCES public.spots(id) ON DELETE CASCADE
);

-- Create index on user_id for user favorite queries
CREATE INDEX idx_favorite_spots_user_id ON public.favorite_spots(user_id);

-- Create index on spot_id for spot favorite queries
CREATE INDEX idx_favorite_spots_spot_id ON public.favorite_spots(spot_id);

-- Create index on display_order for ordered queries
CREATE INDEX idx_favorite_spots_display_order ON public.favorite_spots(user_id, display_order);

COMMENT ON TABLE public.favorite_spots IS 'User favorite surf spots with custom ordering';
COMMENT ON COLUMN public.favorite_spots.display_order IS 'User-defined order for displaying favorites';
