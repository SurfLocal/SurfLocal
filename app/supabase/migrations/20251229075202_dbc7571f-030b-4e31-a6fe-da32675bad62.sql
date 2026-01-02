-- Create spots table for forecasts
CREATE TABLE public.spots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  location TEXT NOT NULL,
  latitude DECIMAL(10,7) NOT NULL,
  longitude DECIMAL(10,7) NOT NULL,
  description TEXT,
  difficulty TEXT,
  break_type TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create follows table for social features
CREATE TABLE public.follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(follower_id, following_id)
);

-- Create session_likes table (shaka)
CREATE TABLE public.session_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, session_id)
);

-- Create session_comments table
CREATE TABLE public.session_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create forecast_comments table
CREATE TABLE public.forecast_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  spot_id UUID NOT NULL REFERENCES public.spots(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create session_media table for photos/videos
CREATE TABLE public.session_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  media_type TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all new tables
ALTER TABLE public.spots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forecast_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_media ENABLE ROW LEVEL SECURITY;

-- Spots policies (public read)
CREATE POLICY "Anyone can view spots" ON public.spots FOR SELECT USING (true);

-- Follows policies
CREATE POLICY "Users can view follows" ON public.follows FOR SELECT USING (true);
CREATE POLICY "Users can follow others" ON public.follows FOR INSERT WITH CHECK (auth.uid() = follower_id);
CREATE POLICY "Users can unfollow" ON public.follows FOR DELETE USING (auth.uid() = follower_id);

-- Session likes policies
CREATE POLICY "Anyone can view likes" ON public.session_likes FOR SELECT USING (true);
CREATE POLICY "Users can like sessions" ON public.session_likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can unlike" ON public.session_likes FOR DELETE USING (auth.uid() = user_id);

-- Session comments policies
CREATE POLICY "Anyone can view comments" ON public.session_comments FOR SELECT USING (true);
CREATE POLICY "Users can comment" ON public.session_comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own comments" ON public.session_comments FOR DELETE USING (auth.uid() = user_id);

-- Forecast comments policies
CREATE POLICY "Anyone can view forecast comments" ON public.forecast_comments FOR SELECT USING (true);
CREATE POLICY "Users can add forecast comments" ON public.forecast_comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own forecast comments" ON public.forecast_comments FOR DELETE USING (auth.uid() = user_id);

-- Session media policies
CREATE POLICY "Anyone can view media on public sessions" ON public.session_media FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.sessions s WHERE s.id = session_id AND (s.is_public = true OR s.user_id = auth.uid()))
);
CREATE POLICY "Users can add media to own sessions" ON public.session_media FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own media" ON public.session_media FOR DELETE USING (auth.uid() = user_id);

-- Create storage bucket for session media
INSERT INTO storage.buckets (id, name, public) VALUES ('session-media', 'session-media', true);

-- Storage policies for session media
CREATE POLICY "Anyone can view session media" ON storage.objects FOR SELECT USING (bucket_id = 'session-media');
CREATE POLICY "Authenticated users can upload media" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'session-media' AND auth.role() = 'authenticated');
CREATE POLICY "Users can delete own media" ON storage.objects FOR DELETE USING (bucket_id = 'session-media' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Add some sample spots
INSERT INTO public.spots (name, location, latitude, longitude, description, difficulty, break_type) VALUES
('Pipeline', 'Oahu, Hawaii', 21.6650, -158.0530, 'Famous for its massive barrels', 'Expert', 'Reef'),
('Trestles', 'San Clemente, CA', 33.3825, -117.5889, 'High-performance waves', 'Intermediate', 'Cobblestone'),
('Mavericks', 'Half Moon Bay, CA', 37.4950, -122.4970, 'Big wave spot', 'Expert', 'Reef'),
('Rincon', 'Santa Barbara, CA', 34.3742, -119.4756, 'Queen of the coast point break', 'Intermediate', 'Point'),
('Blacks Beach', 'San Diego, CA', 32.8892, -117.2531, 'Powerful beach break', 'Advanced', 'Beach');