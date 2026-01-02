-- Create session_kooks table for downvotes
CREATE TABLE public.session_kooks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(session_id, user_id)
);

-- Enable RLS
ALTER TABLE public.session_kooks ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view all kooks" ON public.session_kooks FOR SELECT USING (true);
CREATE POLICY "Users can add their own kook" ON public.session_kooks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can remove their own kook" ON public.session_kooks FOR DELETE USING (auth.uid() = user_id);

-- Index for performance
CREATE INDEX idx_session_kooks_session_id ON public.session_kooks(session_id);
CREATE INDEX idx_session_kooks_user_id ON public.session_kooks(user_id);