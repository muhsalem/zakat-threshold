CREATE TABLE IF NOT EXISTS public.market_ticks (
  ts timestamptz PRIMARY KEY CHECK (ts = date_trunc('minute', ts)),
  gold_usd_oz numeric NOT NULL CHECK (gold_usd_oz > 0),
  silver_usd_oz numeric NOT NULL CHECK (silver_usd_oz > 0),
  source text NOT NULL,
  status text NOT NULL CHECK (status IN ('agree', 'warn', 'diverged', 'single')),
  deviation_pct numeric NOT NULL DEFAULT 0,
  quality text NOT NULL DEFAULT 'live' CHECK (quality IN ('live', 'delayed', 'stale'))
);
GRANT SELECT ON public.market_ticks TO anon, authenticated;
GRANT ALL ON public.market_ticks TO service_role;
ALTER TABLE public.market_ticks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Market ticks are public" ON public.market_ticks;
CREATE POLICY "Market ticks are public" ON public.market_ticks FOR SELECT USING (true);
CREATE OR REPLACE FUNCTION public.market_ticks_immutable() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  RAISE EXCEPTION 'market_ticks rows are immutable';
END;
$$;
DROP TRIGGER IF EXISTS market_ticks_no_change ON public.market_ticks;
CREATE TRIGGER market_ticks_no_change BEFORE UPDATE OR DELETE ON public.market_ticks
  FOR EACH ROW EXECUTE FUNCTION public.market_ticks_immutable();
CREATE OR REPLACE VIEW public.market_daily WITH (security_invoker = true) AS
SELECT (ts AT TIME ZONE 'UTC')::date AS day,
  (array_agg(gold_usd_oz ORDER BY ts))[1] AS gold_open, max(gold_usd_oz) AS gold_high,
  min(gold_usd_oz) AS gold_low, (array_agg(gold_usd_oz ORDER BY ts DESC))[1] AS gold_close,
  (array_agg(silver_usd_oz ORDER BY ts))[1] AS silver_open, max(silver_usd_oz) AS silver_high,
  min(silver_usd_oz) AS silver_low, (array_agg(silver_usd_oz ORDER BY ts DESC))[1] AS silver_close,
  count(*) AS ticks
FROM public.market_ticks GROUP BY 1;
GRANT SELECT ON public.market_daily TO anon, authenticated, service_role;

CREATE TABLE IF NOT EXISTS public.country_price_updates (
 country text NOT NULL,
 local_date date NOT NULL,
 local_hour smallint NOT NULL CHECK (local_hour IN (11,23)),
 time_zone text NOT NULL,
 slot_at timestamptz NOT NULL,
 updated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY (country, local_date, local_hour)
);
GRANT ALL ON public.country_price_updates TO service_role;
ALTER TABLE public.country_price_updates ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS country_price_updates_slot_at ON public.country_price_updates(slot_at DESC);