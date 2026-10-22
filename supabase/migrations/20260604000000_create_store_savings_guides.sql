-- Store-specific savings guide notes imported from CSV or maintained by admins.
-- These notes power the guide block that appears after code cards, checkout screenshots, and deals.

CREATE TABLE IF NOT EXISTS public.store_savings_guides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  priority TEXT,
  shipping_note TEXT,
  return_note TEXT,
  stacking_note TEXT,
  sale_item_note TEXT,
  reference_urls JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('draft', 'published', 'archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (store_id)
);

ALTER TABLE public.store_savings_guides ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view published store savings guides" ON public.store_savings_guides;
CREATE POLICY "Public can view published store savings guides"
  ON public.store_savings_guides
  FOR SELECT
  USING (status = 'published');

DROP POLICY IF EXISTS "Admins can view all store savings guides" ON public.store_savings_guides;
CREATE POLICY "Admins can view all store savings guides"
  ON public.store_savings_guides
  FOR SELECT
  TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can insert store savings guides" ON public.store_savings_guides;
CREATE POLICY "Admins can insert store savings guides"
  ON public.store_savings_guides
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can update store savings guides" ON public.store_savings_guides;
CREATE POLICY "Admins can update store savings guides"
  ON public.store_savings_guides
  FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can delete store savings guides" ON public.store_savings_guides;
CREATE POLICY "Admins can delete store savings guides"
  ON public.store_savings_guides
  FOR DELETE
  TO authenticated
  USING (public.is_admin());

CREATE INDEX IF NOT EXISTS store_savings_guides_store_id_idx ON public.store_savings_guides(store_id);
CREATE INDEX IF NOT EXISTS store_savings_guides_status_updated_at_idx ON public.store_savings_guides(status, updated_at DESC);

DROP TRIGGER IF EXISTS update_store_savings_guides_updated_at ON public.store_savings_guides;
CREATE TRIGGER update_store_savings_guides_updated_at
BEFORE UPDATE ON public.store_savings_guides
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
