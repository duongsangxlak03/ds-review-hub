-- Auto-seed baseline activity for newly imported stores/coupons.
-- Paste and run this whole file at once in Supabase SQL Editor.
-- This only manages generated rows with the seed-weekly-v1 prefix and seeded guest names.

CREATE OR REPLACE FUNCTION public.seeded_int(seed text, min_value integer, max_value integer)
RETURNS integer
LANGUAGE sql
IMMUTABLE
AS $seeded_int$
  WITH bounds AS (
    SELECT LEAST(min_value, max_value) AS lo, GREATEST(min_value, max_value) AS hi
  )
  SELECT lo + (ABS(hashtext(seed)::bigint) % (hi - lo + 1))::integer
  FROM bounds;
$seeded_int$;

CREATE OR REPLACE FUNCTION public.seed_store_weekly_activity(
  target_store_id uuid,
  coupon_limit integer DEFAULT 10
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $seed_weekly$
DECLARE
  coupon_ids uuid[];
  coupon_codes text[];
  coupon_count integer;
  day_index integer;
  activity_date date;
  day_of_week integer;
  base_target integer;
  day_target integer;
  event_index integer;
  coupon_index integer;
  selected_coupon_id uuid;
  selected_coupon_code text;
  selected_event_type text;
  minute_offset integer;
BEGIN
  SELECT
    array_agg(id ORDER BY sort_order, created_at, id),
    array_agg(code ORDER BY sort_order, created_at, id)
  INTO coupon_ids, coupon_codes
  FROM (
    SELECT id, code, sort_order, created_at
    FROM public.coupons
    WHERE store_id = target_store_id
      AND is_active = true
    ORDER BY sort_order, created_at, id
    LIMIT GREATEST(coupon_limit, 1)
  ) ranked_coupons;

  coupon_count := COALESCE(array_length(coupon_ids, 1), 0);
  IF coupon_count = 0 THEN
    RETURN;
  END IF;

  DELETE FROM public.coupon_events
  WHERE coupon_id = ANY(coupon_ids)
    AND session_id LIKE 'seed-weekly-v1:%';

  FOR day_index IN 0..6 LOOP
    activity_date := current_date - (6 - day_index);
    day_of_week := EXTRACT(DOW FROM activity_date)::integer;

    IF day_of_week IN (2, 3) THEN
      day_target := public.seeded_int(target_store_id::text || ':' || activity_date::text || ':weak', 10, 14);
    ELSE
      base_target := 10 + ((20 * day_index + 3) / 6);
      day_target := public.seeded_int(
        target_store_id::text || ':' || activity_date::text || ':growth',
        GREATEST(10, base_target - 2),
        LEAST(30, base_target + 2)
      );
    END IF;

    FOR event_index IN 1..day_target LOOP
      coupon_index := (
        (event_index + public.seeded_int(target_store_id::text || ':' || activity_date::text || ':coupon-offset', 0, coupon_count - 1) - 1)
        % coupon_count
      ) + 1;

      selected_coupon_id := coupon_ids[coupon_index];
      selected_coupon_code := coupon_codes[coupon_index];
      selected_event_type := CASE
        WHEN selected_coupon_code IS NULL OR upper(selected_coupon_code) = 'NOCODE' THEN 'open_deal'
        ELSE 'show_code'
      END;
      minute_offset := public.seeded_int(
        target_store_id::text || ':' || selected_coupon_id::text || ':' || activity_date::text || ':' || event_index::text || ':minute',
        480,
        1320
      );

      INSERT INTO public.coupon_events (coupon_id, event_type, session_id, created_at)
      VALUES (
        selected_coupon_id,
        selected_event_type,
        'seed-weekly-v1:' || target_store_id::text || ':' || activity_date::text || ':' || event_index::text,
        timezone('UTC', activity_date::timestamp + (minute_offset * interval '1 minute'))
      );
    END LOOP;
  END LOOP;
END;
$seed_weekly$;

CREATE OR REPLACE FUNCTION public.seed_store_customer_reports(
  target_store_id uuid,
  report_count integer DEFAULT 3
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $seed_reports$
DECLARE
  target_coupon_id uuid;
  customer_names text[] := ARRAY[
    'Guest shopper 1842',
    'Guest shopper 5290',
    'Guest shopper 7136',
    'Guest shopper 2408',
    'Guest shopper 9061',
    'Guest shopper 3774'
  ];
  report_notes text[] := ARRAY[
    'Checkout report: code applied on the merchant site.',
    'Customer report from checkout flow.',
    'Reported after testing the code at checkout.',
    'Customer marked this offer as working.'
  ];
  report_minutes integer[] := ARRAY[11, 23, 41, 66, 94, 128];
  report_index integer;
  name_index integer;
  note_index integer;
BEGIN
  SELECT id
  INTO target_coupon_id
  FROM public.coupons
  WHERE store_id = target_store_id
    AND is_active = true
  ORDER BY sort_order, created_at, id
  LIMIT 1;

  IF target_coupon_id IS NULL THEN
    RETURN;
  END IF;

  DELETE FROM public.coupon_verifications
  WHERE coupon_id = target_coupon_id
    AND verification_method = 'customer_report'
    AND verifier_name = ANY(customer_names)
    AND note = ANY(report_notes);

  FOR report_index IN 1..LEAST(GREATEST(report_count, 0), array_length(customer_names, 1)) LOOP
    name_index := ((report_index - 1) % array_length(customer_names, 1)) + 1;
    note_index := ((report_index - 1) % array_length(report_notes, 1)) + 1;

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
      target_coupon_id,
      customer_names[name_index],
      'customer_report',
      'working',
      report_notes[note_index],
      NULL,
      now() - (report_minutes[name_index] * interval '1 minute')
    );
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
  PERFORM public.seed_store_customer_reports(target_store_id, 3);
END;
$seed_baseline$;

CREATE OR REPLACE FUNCTION public.seed_coupon_baseline_after_coupon_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $coupon_trigger$
BEGIN
  IF NEW.store_id IS NOT NULL AND NEW.is_active = true THEN
    PERFORM public.seed_store_coupon_baseline(NEW.store_id);
  END IF;
  RETURN NEW;
END;
$coupon_trigger$;

DROP TRIGGER IF EXISTS seed_coupon_baseline_after_coupon_change_trigger ON public.coupons;
CREATE TRIGGER seed_coupon_baseline_after_coupon_change_trigger
AFTER INSERT OR UPDATE OF store_id, is_active, sort_order, code ON public.coupons
FOR EACH ROW
WHEN (NEW.is_active = true)
EXECUTE FUNCTION public.seed_coupon_baseline_after_coupon_change();

CREATE OR REPLACE FUNCTION public.seed_coupon_baseline_after_store_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $store_trigger$
BEGIN
  IF NEW.id IS NOT NULL AND NEW.is_active = true THEN
    PERFORM public.seed_store_coupon_baseline(NEW.id);
  END IF;
  RETURN NEW;
END;
$store_trigger$;

DROP TRIGGER IF EXISTS seed_coupon_baseline_after_store_change_trigger ON public.stores;
CREATE TRIGGER seed_coupon_baseline_after_store_change_trigger
AFTER INSERT OR UPDATE OF is_active ON public.stores
FOR EACH ROW
WHEN (NEW.is_active = true)
EXECUTE FUNCTION public.seed_coupon_baseline_after_store_change();

CREATE OR REPLACE FUNCTION public.seed_store_coupon_baseline_all(store_limit integer DEFAULT 1000)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $seed_all$
DECLARE
  store_record record;
  seeded_count integer := 0;
BEGIN
  FOR store_record IN
    SELECT id
    FROM public.stores
    WHERE is_active = true
    ORDER BY name
    LIMIT GREATEST(store_limit, 1)
  LOOP
    PERFORM public.seed_store_coupon_baseline(store_record.id);
    seeded_count := seeded_count + 1;
  END LOOP;

  RETURN seeded_count;
END;
$seed_all$;
