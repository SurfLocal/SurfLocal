-- Create favorite_spots table for storing user's favorite spots with ordering
CREATE TABLE public.favorite_spots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  spot_id UUID NOT NULL REFERENCES public.spots(id) ON DELETE CASCADE,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, spot_id)
);

-- Add foreign key to auth.users with cascade delete
ALTER TABLE public.favorite_spots
ADD CONSTRAINT favorite_spots_user_id_fkey
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Enable Row Level Security
ALTER TABLE public.favorite_spots ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own favorite spots"
ON public.favorite_spots
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can add their own favorite spots"
ON public.favorite_spots
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own favorite spots"
ON public.favorite_spots
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own favorite spots"
ON public.favorite_spots
FOR DELETE
USING (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX idx_favorite_spots_user_id ON public.favorite_spots(user_id);
CREATE INDEX idx_favorite_spots_display_order ON public.favorite_spots(user_id, display_order);