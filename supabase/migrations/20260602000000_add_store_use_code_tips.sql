-- Optional checkout tips for selected stores. Images are optimized in the admin
-- before upload so regular store pages do not pay an image-loading cost.
ALTER TABLE public.stores
ADD COLUMN IF NOT EXISTS use_code_tips JSONB NOT NULL DEFAULT '[]'::jsonb;

INSERT INTO storage.buckets (id, name, public)
VALUES ('store-code-tips', 'store-code-tips', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Public can view store code tips'
  ) THEN
    CREATE POLICY "Public can view store code tips"
    ON storage.objects
    FOR SELECT
    USING (bucket_id = 'store-code-tips');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Admins can upload store code tips'
  ) THEN
    CREATE POLICY "Admins can upload store code tips"
    ON storage.objects
    FOR INSERT
    WITH CHECK (bucket_id = 'store-code-tips' AND public.is_admin());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Admins can update store code tips'
  ) THEN
    CREATE POLICY "Admins can update store code tips"
    ON storage.objects
    FOR UPDATE
    USING (bucket_id = 'store-code-tips' AND public.is_admin());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Admins can delete store code tips'
  ) THEN
    CREATE POLICY "Admins can delete store code tips"
    ON storage.objects
    FOR DELETE
    USING (bucket_id = 'store-code-tips' AND public.is_admin());
  END IF;
END $$;

-- Stop generated activity from being recreated and remove generated rows only.
-- Real coupon events and admin-recorded verification rows are left untouched.
DROP TRIGGER IF EXISTS seed_coupon_baseline_after_coupon_change_trigger ON public.coupons;
DROP TRIGGER IF EXISTS seed_coupon_baseline_after_store_change_trigger ON public.stores;

DELETE FROM public.coupon_events
WHERE session_id LIKE 'seed-weekly-v1:%'
   OR session_id LIKE 'seed-today-v2:%';

DELETE FROM public.coupon_verifications
WHERE verification_method = 'customer_report'
  AND verifier_name = ANY (ARRAY[
    'Guest shopper 1842',
    'Guest shopper 5290',
    'Guest shopper 7136',
    'Guest shopper 2408',
    'Guest shopper 9061',
    'Guest shopper 3774',
    'Deal checker 1186',
    'Coupon user 6420'
  ]);

DROP FUNCTION IF EXISTS public.seed_store_coupon_baseline_all(integer);
DROP FUNCTION IF EXISTS public.seed_store_today_activity_all(integer);
DROP FUNCTION IF EXISTS public.seed_coupon_baseline_after_coupon_change();
DROP FUNCTION IF EXISTS public.seed_coupon_baseline_after_store_change();
DROP FUNCTION IF EXISTS public.seed_store_coupon_baseline(uuid);
DROP FUNCTION IF EXISTS public.seed_store_customer_reports(uuid, integer);
DROP FUNCTION IF EXISTS public.seed_store_today_activity(uuid, integer, integer, integer, integer);
DROP FUNCTION IF EXISTS public.seed_store_weekly_activity(uuid, integer);
DROP FUNCTION IF EXISTS public.seeded_int(text, integer, integer);
