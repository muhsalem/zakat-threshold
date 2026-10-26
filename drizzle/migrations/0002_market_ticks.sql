-- One row per UTC minute: the market price the site showed and the agreement between sources.
-- A country's nisab at any past minute is derived, not stored per country:
--   nisab = USD/oz ÷ 31.1034768 × fx_rates[currency] (from price_snapshots for that day) × weight
-- At one row a minute this is about 525,000 rows a year: small for Postgres, and it
-- keeps the history complete for every country at once.
CREATE TABLE IF NOT EXISTS public.market_ticks (
  ts timestamptz PRIMARY KEY CHECK (ts = date_trunc('minute', ts)),
  gold_usd_oz numeric NOT NULL CHECK (gold_usd_oz > 0),
  silver_usd_oz numeric NOT NULL CHECK (silver_usd_oz > 0),
  source text NOT NULL,
  status text NOT NULL CHECK (status IN ('agree', 'warn', 'diverged', 'single')),
  deviation_pct numeric NOT NULL DEFAULT 0,
  quality text NOT NULL DEFAULT 'live' CHECK (quality IN ('live', 'delayed', 'stale'))
);

ALTER TABLE public.market_ticks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Market ticks are public" ON public.market_ticks;
CREATE POLICY "Market ticks are public" ON public.market_ticks FOR SELECT USING (true);

GRANT SELECT ON public.market_ticks TO anon, authenticated;
GRANT ALL ON public.market_ticks TO service_role;

-- A recorded minute is history: no edits or deletes (a correction is an explicit migration).
CREATE OR REPLACE FUNCTION public.market_ticks_immutable() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'market_ticks rows are immutable';
END;
$$;

DROP TRIGGER IF EXISTS market_ticks_no_change ON public.market_ticks;
CREATE TRIGGER market_ticks_no_change
  BEFORE UPDATE OR DELETE ON public.market_ticks
  FOR EACH ROW EXECUTE FUNCTION public.market_ticks_immutable();

-- Daily open/high/low/close, so long ranges never scan every minute.
CREATE OR REPLACE VIEW public.market_daily WITH (security_invoker = true) AS
SELECT
  (ts AT TIME ZONE 'UTC')::date AS day,
  (array_agg(gold_usd_oz ORDER BY ts))[1] AS gold_open,
  max(gold_usd_oz) AS gold_high,
  min(gold_usd_oz) AS gold_low,
  (array_agg(gold_usd_oz ORDER BY ts DESC))[1] AS gold_close,
  (array_agg(silver_usd_oz ORDER BY ts))[1] AS silver_open,
  max(silver_usd_oz) AS silver_high,
  min(silver_usd_oz) AS silver_low,
  (array_agg(silver_usd_oz ORDER BY ts DESC))[1] AS silver_close,
  count(*) AS ticks
FROM public.market_ticks
GROUP BY 1;

GRANT SELECT ON public.market_daily TO anon, authenticated, service_role;

COMMENT ON TABLE public.market_ticks IS 'Immutable per-minute gold/silver USD/oz with source agreement. Per-country nisab is derived from it plus price_snapshots.fx_rates.';
