-- Create storage bucket for media files
INSERT INTO storage.buckets (id, name, public)
VALUES ('media', 'media', true)
ON CONFLICT (id) DO NOTHING;

-- Policy for public viewing of media
CREATE POLICY "Public can view media"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'media');

-- Policy for service role upload (edge functions use service role)
CREATE POLICY "Service role can upload media"
ON storage.objects FOR INSERT
TO service_role
WITH CHECK (bucket_id = 'media');

-- Policy for authenticated users upload
CREATE POLICY "Authenticated users can upload media"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'media');