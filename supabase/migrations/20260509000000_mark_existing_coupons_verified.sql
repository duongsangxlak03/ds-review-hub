-- Existing active coupons were manually verified before import.
UPDATE public.coupons
SET is_verified = true,
    updated_at = now()
WHERE is_active = true;
