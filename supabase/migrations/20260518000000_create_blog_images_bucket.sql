-- Public bucket for uploaded blog images.
INSERT INTO storage.buckets (id, name, public)
VALUES ('blog-images', 'blog-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Public can view blog images'
  ) THEN
    CREATE POLICY "Public can view blog images"
    ON storage.objects
    FOR SELECT
    USING (bucket_id = 'blog-images');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Admins can upload blog images'
  ) THEN
    CREATE POLICY "Admins can upload blog images"
    ON storage.objects
    FOR INSERT
    WITH CHECK (bucket_id = 'blog-images' AND public.is_admin());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Admins can update blog images'
  ) THEN
    CREATE POLICY "Admins can update blog images"
    ON storage.objects
    FOR UPDATE
    USING (bucket_id = 'blog-images' AND public.is_admin());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Admins can delete blog images'
  ) THEN
    CREATE POLICY "Admins can delete blog images"
    ON storage.objects
    FOR DELETE
    USING (bucket_id = 'blog-images' AND public.is_admin());
  END IF;
END $$;
