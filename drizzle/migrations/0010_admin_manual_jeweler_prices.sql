CREATE OR REPLACE FUNCTION public.save_admin_jeweler_price(_country text, _currency text, _gold numeric, _silver numeric, _gold_buyback numeric, _silver_buyback numeric, _source text, _reason text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE actor uuid := auth.uid(); stamp timestamptz := now(); today date := (now() AT TIME ZONE 'UTC')::date; feed_id uuid; previous jsonb;
BEGIN
 IF actor IS NULL OR NOT public.has_role(actor, 'admin'::public.app_role) THEN RAISE EXCEPTION 'Forbidden' USING ERRCODE = '42501'; END IF;
 IF _country !~ '^[A-Z]{2}$' OR _currency !~ '^[A-Z]{3}$' OR length(trim(_source)) NOT BETWEEN 3 AND 200 OR length(trim(_reason)) NOT BETWEEN 3 AND 300 OR (_gold IS NULL AND _silver IS NULL) THEN RAISE EXCEPTION 'Invalid price input'; END IF;
 IF EXISTS (SELECT 1 FROM unnest(ARRAY[_gold,_silver,_gold_buyback,_silver_buyback]) n WHERE n <= 0 OR n > 1000000000 OR n::text IN ('NaN','Infinity','-Infinity')) OR (_gold_buyback IS NOT NULL AND (_gold IS NULL OR _gold_buyback > _gold)) OR (_silver_buyback IS NOT NULL AND (_silver IS NULL OR _silver_buyback > _silver)) THEN RAISE EXCEPTION 'Invalid price input'; END IF;
 PERFORM pg_advisory_xact_lock(hashtext(_country || today::text));
 SELECT to_jsonb(f) INTO previous FROM public.jeweler_feed f WHERE country=_country AND day=today FOR UPDATE;
 INSERT INTO public.jeweler_feed(country,currency,day,gold_gram,silver_gram,buyback_gram,silver_buyback_gram,source,fetched_at)
 VALUES (_country,_currency,today,_gold,_silver,_gold_buyback,_silver_buyback,trim(_source),stamp)
 ON CONFLICT(country,day) DO UPDATE SET currency=EXCLUDED.currency,gold_gram=EXCLUDED.gold_gram,silver_gram=EXCLUDED.silver_gram,buyback_gram=EXCLUDED.buyback_gram,silver_buyback_gram=EXCLUDED.silver_buyback_gram,source=EXCLUDED.source,fetched_at=EXCLUDED.fetched_at,source_url=NULL,change_pct=NULL RETURNING id INTO feed_id;
 INSERT INTO public.nisab_history(country,currency,day,gold_gram,silver_gram,gold_nisab,silver_nisab,source)
 VALUES (_country,_currency,today,coalesce(_gold_buyback,_gold),coalesce(_silver_buyback,_silver),coalesce(_gold_buyback,_gold)*85,coalesce(_silver_buyback,_silver)*595,trim(_source))
 ON CONFLICT(country,day) DO UPDATE SET currency=EXCLUDED.currency,gold_gram=EXCLUDED.gold_gram,silver_gram=EXCLUDED.silver_gram,gold_nisab=EXCLUDED.gold_nisab,silver_nisab=EXCLUDED.silver_nisab,source=EXCLUDED.source;
 INSERT INTO public.audit_log(actor_id,action,entity,entity_id,reason,meta)
 VALUES(actor,'manual_jeweler_price','jeweler_feed',feed_id::text,trim(_reason),jsonb_build_object('country',_country,'currency',_currency,'day',today,'gold',_gold,'silver',_silver,'goldBuyback',_gold_buyback,'silverBuyback',_silver_buyback,'source',trim(_source),'previous',previous,'effectiveAt',stamp));
 RETURN feed_id;
END $$;
REVOKE ALL ON FUNCTION public.save_admin_jeweler_price(text,text,numeric,numeric,numeric,numeric,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_admin_jeweler_price(text,text,numeric,numeric,numeric,numeric,text,text) TO authenticated;