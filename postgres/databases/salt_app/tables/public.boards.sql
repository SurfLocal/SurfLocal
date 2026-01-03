-- Boards table - User's surfboards (quiver)
CREATE TABLE public.boards (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    name TEXT NOT NULL,
    brand TEXT,
    model TEXT,
    board_type TEXT,
    length_feet INTEGER,
    length_inches INTEGER,
    volume_liters NUMERIC,
    photo_url TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    CONSTRAINT boards_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Create index on user_id for faster user board queries
CREATE INDEX idx_boards_user_id ON public.boards(user_id);

COMMENT ON TABLE public.boards IS 'User surfboard collection (quiver)';
COMMENT ON COLUMN public.boards.board_type IS 'Type of board (e.g., shortboard, longboard, fish)';
COMMENT ON COLUMN public.boards.volume_liters IS 'Board volume in liters';
COMMENT ON COLUMN public.boards.photo_url IS 'URL to board photo in MinIO storage';
