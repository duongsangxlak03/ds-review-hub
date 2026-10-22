-- Keep AI-product reviews and ecommerce-store reviews in separate admin workflows.
ALTER TABLE public.store_reviews
  ADD COLUMN IF NOT EXISTS review_vertical TEXT;

UPDATE public.store_reviews AS review
SET review_vertical = CASE
  WHEN EXISTS (
    SELECT 1
    FROM public.stores AS store
    WHERE store.id = review.store_id
      AND concat_ws(' ', store.name, store.category) ~* '(artificial intelligence|(^|[^a-z])ai([^a-z]|$)|machine learning|llm)'
  ) THEN 'ai'
  ELSE 'ecommerce'
END
WHERE review_vertical IS NULL;

ALTER TABLE public.store_reviews
  ALTER COLUMN review_vertical SET DEFAULT 'ecommerce',
  ALTER COLUMN review_vertical SET NOT NULL;

ALTER TABLE public.store_reviews
  DROP CONSTRAINT IF EXISTS store_reviews_review_vertical_check;

ALTER TABLE public.store_reviews
  ADD CONSTRAINT store_reviews_review_vertical_check
  CHECK (review_vertical IN ('ai', 'ecommerce'));

CREATE INDEX IF NOT EXISTS store_reviews_vertical_status_updated_at_idx
  ON public.store_reviews(review_vertical, status, updated_at DESC);
