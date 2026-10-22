DROP POLICY IF EXISTS "Admins can manage google_tags" ON public.google_tags;
DROP POLICY IF EXISTS "Admins can select google_tags" ON public.google_tags;
DROP POLICY IF EXISTS "Admins can insert google_tags" ON public.google_tags;
DROP POLICY IF EXISTS "Admins can update google_tags" ON public.google_tags;
DROP POLICY IF EXISTS "Admins can delete google_tags" ON public.google_tags;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.google_tags;
DROP POLICY IF EXISTS "Public can view active google_tags" ON public.google_tags;

CREATE POLICY "Admins can select google_tags"
ON public.google_tags
FOR SELECT
TO authenticated
USING (public.is_admin());

CREATE POLICY "Admins can insert google_tags"
ON public.google_tags
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update google_tags"
ON public.google_tags
FOR UPDATE
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete google_tags"
ON public.google_tags
FOR DELETE
TO authenticated
USING (public.is_admin());

CREATE POLICY "Public can view active google_tags"
ON public.google_tags
FOR SELECT
TO public
USING (is_active = true);
