-- Create table for kook reactions on forecast comments
CREATE TABLE public.forecast_comment_kooks (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  comment_id uuid NOT NULL REFERENCES public.forecast_comments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(comment_id, user_id)
);

-- Enable RLS
ALTER TABLE public.forecast_comment_kooks ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can view forecast comment kooks"
ON public.forecast_comment_kooks
FOR SELECT
USING (true);

CREATE POLICY "Users can kook forecast comments"
ON public.forecast_comment_kooks
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unkook forecast comments"
ON public.forecast_comment_kooks
FOR DELETE
USING (auth.uid() = user_id);