-- ============================================
-- STORAGE BUCKETS
-- For Supabase Storage - adapt for your storage solution
-- ============================================

-- Note: These are Supabase-specific commands
-- For self-hosted, you'll need to use a different storage solution
-- like MinIO, S3, or local filesystem

-- ----------------------------------------
-- CREATE STORAGE BUCKETS
-- ----------------------------------------

-- Session media bucket (photos/videos from surf sessions)
INSERT INTO storage.buckets (id, name, public)
VALUES ('session-media', 'session-media', true);

-- User avatars bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true);

-- Board photos bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('board-photos', 'board-photos', true);

-- ----------------------------------------
-- STORAGE POLICIES
-- ----------------------------------------

-- Session media policies
CREATE POLICY "Anyone can view session media"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'session-media');

CREATE POLICY "Authenticated users can upload session media"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'session-media' 
        AND auth.role() = 'authenticated'
    );

CREATE POLICY "Users can delete their own session media"
    ON storage.objects FOR DELETE
    USING (
        bucket_id = 'session-media' 
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

-- Avatar policies
CREATE POLICY "Anyone can view avatars"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'avatars');

CREATE POLICY "Authenticated users can upload avatars"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'avatars' 
        AND auth.role() = 'authenticated'
    );

CREATE POLICY "Users can update their own avatar"
    ON storage.objects FOR UPDATE
    USING (
        bucket_id = 'avatars' 
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can delete their own avatar"
    ON storage.objects FOR DELETE
    USING (
        bucket_id = 'avatars' 
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

-- Board photos policies
CREATE POLICY "Anyone can view board photos"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'board-photos');

CREATE POLICY "Authenticated users can upload board photos"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'board-photos' 
        AND auth.role() = 'authenticated'
    );

CREATE POLICY "Users can delete their own board photos"
    ON storage.objects FOR DELETE
    USING (
        bucket_id = 'board-photos' 
        AND auth.uid()::text = (storage.foldername(name))[1]
    );
