-- Add photo_url column to boards table
ALTER TABLE public.boards ADD COLUMN photo_url text;

-- Create storage bucket for board photos
INSERT INTO storage.buckets (id, name, public) VALUES ('board-photos', 'board-photos', true);

-- Create storage policies for board photos
CREATE POLICY "Board photos are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'board-photos');

CREATE POLICY "Users can upload their own board photos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'board-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own board photos"
ON storage.objects FOR UPDATE
USING (bucket_id = 'board-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own board photos"
ON storage.objects FOR DELETE
USING (bucket_id = 'board-photos' AND auth.uid()::text = (storage.foldername(name))[1]);