-- Real coupon activity and verification data for public coupon cards.

CREATE TABLE IF NOT EXISTS public.coupon_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id UUID REFERENCES public.coupons(id) ON DELETE CASCADE NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('show_code', 'open_deal', 'copy_code', 'vote_worked', 'vote_failed')),
  session_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS coupon_events_coupon_id_created_at_idx
  ON public.coupon_events (coupon_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.coupon_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id UUID REFERENCES public.coupons(id) ON DELETE CASCADE NOT NULL,
  verifier_name TEXT NOT NULL DEFAULT 'DS Review Hub',
  verification_method TEXT NOT NULL DEFAULT 'manual',
  result TEXT NOT NULL DEFAULT 'working' CHECK (result IN ('working', 'failed', 'expired', 'unknown')),
  note TEXT,
  screenshot_url TEXT,
  verified_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS coupon_verifications_coupon_id_verified_at_idx
  ON public.coupon_verifications (coupon_id, verified_at DESC);

ALTER TABLE public.coupon_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupon_verifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can insert coupon events" ON public.coupon_events;
CREATE POLICY "Public can insert coupon events"
  ON public.coupon_events FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can view coupon events" ON public.coupon_events;
CREATE POLICY "Admins can view coupon events"
  ON public.coupon_events FOR SELECT
  TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "Public can view coupon verifications" ON public.coupon_verifications;
CREATE POLICY "Public can view coupon verifications"
  ON public.coupon_verifications FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Admins can manage coupon verifications" ON public.coupon_verifications;
CREATE POLICY "Admins can manage coupon verifications"
  ON public.coupon_verifications FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE OR REPLACE VIEW public.coupon_usage_stats AS
SELECT
  c.id AS coupon_id,
  COUNT(e.id) FILTER (WHERE e.event_type IN ('show_code', 'open_deal'))::integer AS total_uses,
  COUNT(e.id) FILTER (
    WHERE e.event_type IN ('show_code', 'open_deal')
      AND e.created_at >= date_trunc('day', now())
  )::integer AS uses_today,
  MAX(e.created_at) FILTER (WHERE e.event_type IN ('show_code', 'open_deal')) AS last_used_at,
  COUNT(e.id) FILTER (WHERE e.event_type = 'vote_worked')::integer AS worked_votes,
  COUNT(e.id) FILTER (WHERE e.event_type = 'vote_failed')::integer AS failed_votes
FROM public.coupons c
LEFT JOIN public.coupon_events e ON e.coupon_id = c.id
GROUP BY c.id;

GRANT SELECT ON public.coupon_usage_stats TO anon, authenticated;
GRANT INSERT ON public.coupon_events TO anon, authenticated;
GRANT SELECT ON public.coupon_verifications TO anon, authenticated;

CREATE OR REPLACE VIEW public.coupon_activity_daily AS
SELECT
  coupon_id,
  activity_date,
  SUM(activity_count)::integer AS activity_count
FROM (
  SELECT
    coupon_id,
    created_at::date AS activity_date,
    COUNT(*)::integer AS activity_count
  FROM public.coupon_events
  WHERE event_type IN ('show_code', 'open_deal', 'copy_code', 'vote_worked', 'vote_failed')
  GROUP BY coupon_id, created_at::date

  UNION ALL

  SELECT
    coupon_id,
    verified_at::date AS activity_date,
    COUNT(*)::integer AS activity_count
  FROM public.coupon_verifications
  GROUP BY coupon_id, verified_at::date
) activity
GROUP BY coupon_id, activity_date;

GRANT SELECT ON public.coupon_activity_daily TO anon, authenticated;

INSERT INTO public.coupon_verifications (coupon_id, verifier_name, verification_method, result, note, verified_at)
SELECT
  c.id,
  'DS Review Hub',
  'manual',
  'working',
  'Manual verification recorded before listing.',
  COALESCE(c.updated_at, c.created_at, now())
FROM public.coupons c
WHERE c.is_verified = true
  AND NOT EXISTS (
    SELECT 1
    FROM public.coupon_verifications v
    WHERE v.coupon_id = c.id
  );

CREATE OR REPLACE FUNCTION public.log_coupon_manual_verification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.is_verified = true AND (TG_OP = 'INSERT' OR OLD.is_verified IS DISTINCT FROM NEW.is_verified) THEN
    INSERT INTO public.coupon_verifications (coupon_id, verifier_name, verification_method, result, note, verified_at)
    VALUES (NEW.id, 'DS Review Hub', 'manual', 'working', 'Manual verification recorded in admin.', now());
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS log_coupon_manual_verification_trigger ON public.coupons;
CREATE TRIGGER log_coupon_manual_verification_trigger
AFTER INSERT OR UPDATE OF is_verified ON public.coupons
FOR EACH ROW
EXECUTE FUNCTION public.log_coupon_manual_verification();
