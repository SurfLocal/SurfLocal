-- Follows table - User follow relationships
CREATE TABLE public.follows (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    follower_id UUID NOT NULL,
    following_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (follower_id, following_id),
    CONSTRAINT follows_follower_id_fkey FOREIGN KEY (follower_id) REFERENCES auth.users(id) ON DELETE CASCADE,
    CONSTRAINT follows_following_id_fkey FOREIGN KEY (following_id) REFERENCES auth.users(id) ON DELETE CASCADE,
    CONSTRAINT follows_no_self_follow CHECK (follower_id != following_id)
);

-- Create index on follower_id for follower queries
CREATE INDEX idx_follows_follower_id ON public.follows(follower_id);

-- Create index on following_id for following queries
CREATE INDEX idx_follows_following_id ON public.follows(following_id);

COMMENT ON TABLE public.follows IS 'User follow relationships for social features';
COMMENT ON COLUMN public.follows.follower_id IS 'User who is following';
COMMENT ON COLUMN public.follows.following_id IS 'User being followed';
