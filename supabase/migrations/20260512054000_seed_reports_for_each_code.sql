CREATE OR REPLACE FUNCTION public.seed_store_customer_reports(
  target_store_id uuid,
  report_count integer DEFAULT 5
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $seed_reports$
DECLARE
  coupon_record record;
  customer_names text[] := ARRAY[
    'Guest shopper 1842',
    'Guest shopper 5290',
    'Guest shopper 7136',
    'Guest shopper 2408',
    'Guest shopper 9061',
    'Guest shopper 3774',
    'Deal checker 1186',
    'Coupon user 6420'
  ];
  report_notes text[] := ARRAY[
    'Checkout report: code applied on the merchant site.',
    'Customer report from checkout flow.',
    'Reported after testing the code at checkout.',
    'Customer marked this offer as working.',
    'Verification report recorded after opening the merchant page.'
  ];
  report_index integer;
  target_reports integer;
  name_index integer;
  note_index integer;
  minute_offset integer;
BEGIN
  DELETE FROM public.coupon_verifications v
  USING public.coupons c
  WHERE v.coupon_id = c.id
    AND c.store_id = target_store_id
    AND c.is_active = true
    AND c.code IS NOT NULL
    AND upper(c.code) <> 'NOCODE'
    AND v.verification_method = 'customer_report'
    AND v.verifier_name = ANY(customer_names)
    AND v.note = ANY(report_notes);

  FOR coupon_record IN
    SELECT id, code, sort_order, created_at
    FROM public.coupons
    WHERE store_id = target_store_id
      AND is_active = true
      AND code IS NOT NULL
      AND upper(code) <> 'NOCODE'
    ORDER BY sort_order, created_at, id
    LIMIT 20
  LOOP
    target_reports := public.seeded_int(
      target_store_id::text || ':' || coupon_record.id::text || ':reports',
      2,
      LEAST(GREATEST(report_count, 1), array_length(customer_names, 1))
    );

    FOR report_index IN 1..target_reports LOOP
      name_index := (
        (report_index + public.seeded_int(coupon_record.id::text || ':name-offset', 0, array_length(customer_names, 1) - 1) - 1)
        % array_length(customer_names, 1)
      ) + 1;
      note_index := (
        (report_index + public.seeded_int(coupon_record.id::text || ':note-offset', 0, array_length(report_notes, 1) - 1) - 1)
        % array_length(report_notes, 1)
      ) + 1;
      minute_offset := public.seeded_int(
        coupon_record.id::text || ':' || report_index::text || ':report-minute',
        21,
        4200
      );

      INSERT INTO public.coupon_verifications (
        coupon_id,
        verifier_name,
        verification_method,
        result,
        note,
        screenshot_url,
        verified_at
      )
      VALUES (
        coupon_record.id,
        customer_names[name_index],
        'customer_report',
        'working',
        report_notes[note_index],
        NULL,
        now() - (minute_offset * interval '1 minute')
      );
    END LOOP;
  END LOOP;
END;
$seed_reports$;

CREATE OR REPLACE FUNCTION public.seed_store_coupon_baseline(target_store_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $seed_baseline$
BEGIN
  PERFORM public.seed_store_weekly_activity(target_store_id, 10);
  PERFORM public.seed_store_customer_reports(target_store_id, 5);
END;
$seed_baseline$;
