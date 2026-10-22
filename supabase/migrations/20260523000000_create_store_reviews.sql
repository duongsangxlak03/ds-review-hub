-- AI-assisted editorial reviews for store pages.
-- A store has one editable review record that can stay in draft until an admin approves it.

CREATE TABLE IF NOT EXISTS public.store_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  h1 TEXT,
  slug TEXT,
  meta_title TEXT,
  meta_description TEXT,
  dek TEXT,
  summary TEXT NOT NULL,
  verdict TEXT,
  best_for TEXT[] NOT NULL DEFAULT '{}',
  pros TEXT[] NOT NULL DEFAULT '{}',
  cons TEXT[] NOT NULL DEFAULT '{}',
  content_sections JSONB NOT NULL DEFAULT '[]'::jsonb,
  faqs JSONB NOT NULL DEFAULT '[]'::jsonb,
  coupon_strategy JSONB NOT NULL DEFAULT '{}'::jsonb,
  primary_coupon_id UUID REFERENCES public.coupons(id) ON DELETE SET NULL,
  hero_image_url TEXT,
  hero_image_alt TEXT,
  sources JSONB NOT NULL DEFAULT '[]'::jsonb,
  research_queries JSONB NOT NULL DEFAULT '[]'::jsonb,
  title_candidates JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  generated_by TEXT NOT NULL DEFAULT 'ai',
  model TEXT,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (store_id)
);

ALTER TABLE public.store_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view published store reviews" ON public.store_reviews;
CREATE POLICY "Public can view published store reviews"
  ON public.store_reviews
  FOR SELECT
  USING (status = 'published');

DROP POLICY IF EXISTS "Admins can view all store reviews" ON public.store_reviews;
CREATE POLICY "Admins can view all store reviews"
  ON public.store_reviews
  FOR SELECT
  TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can insert store reviews" ON public.store_reviews;
CREATE POLICY "Admins can insert store reviews"
  ON public.store_reviews
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can update store reviews" ON public.store_reviews;
CREATE POLICY "Admins can update store reviews"
  ON public.store_reviews
  FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can delete store reviews" ON public.store_reviews;
CREATE POLICY "Admins can delete store reviews"
  ON public.store_reviews
  FOR DELETE
  TO authenticated
  USING (public.is_admin());

CREATE INDEX IF NOT EXISTS store_reviews_store_id_idx ON public.store_reviews(store_id);
CREATE INDEX IF NOT EXISTS store_reviews_status_updated_at_idx ON public.store_reviews(status, updated_at DESC);

DROP TRIGGER IF EXISTS update_store_reviews_updated_at ON public.store_reviews;
CREATE TRIGGER update_store_reviews_updated_at
BEFORE UPDATE ON public.store_reviews
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
