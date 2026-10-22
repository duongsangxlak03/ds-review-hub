-- Keep every active store/coupon looking alive from day one.
-- Generated rows use the seed-today-v2 prefix only; real user clicks remain untouched.

CREATE OR REPLACE FUNCTION public.seed_store_today_activity(
  target_store_id uuid,
  coupon_limit integer DEFAULT 100,
  min_today integer DEFAULT 4,
  max_today integer DEFAULT 15,
  last_minutes integer DEFAULT 30
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $seed_today$
DECLARE
  coupon_ids uuid[];
  coupon_codes text[];
  coupon_count integer;
  coupon_index integer;
  selected_coupon_id uuid;
  selected_coupon_code text;
  selected_event_type text;
  current_count integer;
  target_count integer;
  missing_count integer;
  event_index integer;
  latest_minutes integer;
  minute_offset integer;
  event_created_at timestamp with time zone;
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

  FOR coupon_index IN 1..coupon_count LOOP
    selected_coupon_id := coupon_ids[coupon_index];
    selected_coupon_code := coupon_codes[coupon_index];
    selected_event_type := CASE
      WHEN selected_coupon_code IS NULL OR upper(selected_coupon_code) = 'NOCODE' THEN 'open_deal'
      ELSE 'show_code'
    END;

    SELECT COUNT(*)::integer
    INTO current_count
    FROM public.coupon_events
    WHERE coupon_id = selected_coupon_id
      AND event_type IN ('show_code', 'open_deal')
      AND created_at >= date_trunc('day', now());

    target_count := public.seeded_int(
      target_store_id::text || ':' || selected_coupon_id::text || ':' || current_date::text || ':today-target',
      LEAST(min_today, max_today),
      GREATEST(min_today, max_today)
    );
    missing_count := GREATEST(target_count - COALESCE(current_count, 0), 0);

    FOR event_index IN 1..missing_count LOOP
      IF event_index = 1 THEN
        latest_minutes := public.seeded_int(
          selected_coupon_id::text || ':' || current_date::text || ':latest-minutes',
          GREATEST(last_minutes - 7, 1),
          GREATEST(last_minutes + 7, 2)
        );
        event_created_at := now() - (latest_minutes * interval '1 minute');
      ELSE
        minute_offset := public.seeded_int(
          selected_coupon_id::text || ':' || current_date::text || ':' || event_index::text || ':minute',
          25,
          720
        );
        event_created_at := date_trunc('day', now()) + (minute_offset * interval '1 minute');

        IF event_created_at > now() - interval '2 minutes' THEN
          event_created_at := now() - ((event_index + 2) * interval '3 minutes');
        END IF;
      END IF;

      INSERT INTO public.coupon_events (coupon_id, event_type, session_id, created_at)
      VALUES (
        selected_coupon_id,
        selected_event_type,
        'seed-today-v2:' || selected_coupon_id::text || ':' || current_date::text || ':' || event_index::text,
        event_created_at
      );
    END LOOP;
  END LOOP;
END;
$seed_today$;

CREATE OR REPLACE FUNCTION public.seed_store_coupon_baseline(target_store_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $seed_baseline$
BEGIN
  PERFORM public.seed_store_weekly_activity(target_store_id, 100);
  PERFORM public.seed_store_today_activity(target_store_id, 100, 4, 15, 30);
  PERFORM public.seed_store_customer_reports(target_store_id, 3);
END;
$seed_baseline$;

CREATE OR REPLACE FUNCTION public.seed_store_today_activity_all(store_limit integer DEFAULT 2000)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $seed_today_all$
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
    PERFORM public.seed_store_today_activity(store_record.id, 100, 4, 15, 30);
    seeded_count := seeded_count + 1;
  END LOOP;

  RETURN seeded_count;
END;
$seed_today_all$;

SELECT public.seed_store_today_activity_all(2000);
