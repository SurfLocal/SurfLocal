-- Create a table for user saved locations from the explore feature
CREATE TABLE public.saved_locations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  latitude NUMERIC NOT NULL,
  longitude NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.saved_locations ENABLE ROW LEVEL SECURITY;

-- Create policies for user access (only owner can see their saved locations)
CREATE POLICY "Users can view their own saved locations" 
ON public.saved_locations 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own saved locations" 
ON public.saved_locations 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own saved locations" 
ON public.saved_locations 
FOR DELETE 
USING (auth.uid() = user_id);