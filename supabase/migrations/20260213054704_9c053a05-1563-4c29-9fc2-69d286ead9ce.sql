-- Create storage bucket for store logos
INSERT INTO storage.buckets (id, name, public) VALUES ('store-logos', 'store-logos', true);

-- Allow public to view logos
CREATE POLICY "Public can view store logos"
ON storage.objects FOR SELECT
USING (bucket_id = 'store-logos');

-- Admins can upload logos
CREATE POLICY "Admins can upload store logos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'store-logos' AND public.is_admin());

-- Admins can update logos
CREATE POLICY "Admins can update store logos"
ON storage.objects FOR UPDATE
USING (bucket_id = 'store-logos' AND public.is_admin());

-- Admins can delete logos
CREATE POLICY "Admins can delete store logos"
ON storage.objects FOR DELETE
USING (bucket_id = 'store-logos' AND public.is_admin());