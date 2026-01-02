-- Add likes for forecast comments
CREATE TABLE public.forecast_comment_likes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  comment_id UUID NOT NULL REFERENCES public.forecast_comments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(comment_id, user_id)
);

ALTER TABLE public.forecast_comment_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view forecast comment likes" ON public.forecast_comment_likes FOR SELECT USING (true);
CREATE POLICY "Users can like forecast comments" ON public.forecast_comment_likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can unlike forecast comments" ON public.forecast_comment_likes FOR DELETE USING (auth.uid() = user_id);

-- Add reply functionality: parent_id column
ALTER TABLE public.forecast_comments ADD COLUMN parent_id UUID REFERENCES public.forecast_comments(id) ON DELETE CASCADE;