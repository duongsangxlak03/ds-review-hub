-- Let visitors submit lightweight coupon reports while keeping admin verifications separate.

DROP POLICY IF EXISTS "Public can submit customer coupon reports" ON public.coupon_verifications;
CREATE POLICY "Public can submit customer coupon reports"
  ON public.coupon_verifications FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    verification_method = 'customer_report'
    AND result IN ('working', 'failed', 'unknown')
    AND screenshot_url IS NULL
    AND char_length(verifier_name) BETWEEN 2 AND 80
    AND (note IS NULL OR char_length(note) <= 240)
  );
