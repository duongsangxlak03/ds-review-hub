
-- Drop restrictive SELECT policies and recreate as permissive
DROP POLICY IF EXISTS "Public can view coupons" ON public.coupons;
DROP POLICY IF EXISTS "Public can view deals" ON public.deals;
DROP POLICY IF EXISTS "Public can view stores" ON public.stores;

CREATE POLICY "Public can view coupons" ON public.coupons FOR SELECT USING (true);
CREATE POLICY "Public can view deals" ON public.deals FOR SELECT USING (true);
CREATE POLICY "Public can view stores" ON public.stores FOR SELECT USING (true);
