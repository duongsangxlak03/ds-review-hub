
ALTER TABLE public.coupons ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0;

CREATE TABLE public.google_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tag_id text NOT NULL,
  tag_type text NOT NULL DEFAULT 'google_ads',
  label text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.google_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage google_tags" ON public.google_tags FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "Public can view active google_tags" ON public.google_tags FOR SELECT TO public USING (is_active = true);
