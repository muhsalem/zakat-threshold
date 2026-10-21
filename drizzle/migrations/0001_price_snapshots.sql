-- Immutable daily snapshot of the raw inputs behind every nisab figure:
-- USD/oz for gold and silver, the exchange rates used, and which sources agreed.
-- Per-country figures can always be re-derived from this row.
CREATE TABLE IF NOT EXISTS public.price_snapshots (
  day date PRIMARY KEY,
  taken_at timestamptz NOT NULL DEFAULT now(),
  gold_usd_oz numeric NOT NULL CHECK (gold_usd_oz > 0),
  silver_usd_oz numeric NOT NULL CHECK (silver_usd_oz > 0),
  metals_source text NOT NULL,
  consensus_status text NOT NULL,
  deviation_pct numeric NOT NULL DEFAULT 0,
  sources jsonb NOT NULL DEFAULT '[]'::jsonb,
  rejected jsonb NOT NULL DEFAULT '[]'::jsonb,
  fx_source text NOT NULL DEFAULT '',
  fx_rates jsonb NOT NULL DEFAULT '{}'::jsonb
);

ALTER TABLE public.price_snapshots ENABLE ROW LEVEL SECURITY;

-- Public, read-only: these are market prices, not personal data.
DROP POLICY IF EXISTS "Price snapshots are public" ON public.price_snapshots;
CREATE POLICY "Price snapshots are public" ON public.price_snapshots FOR SELECT USING (true);

GRANT SELECT ON public.price_snapshots TO anon, authenticated;
GRANT ALL ON public.price_snapshots TO service_role;

-- The first snapshot of a day is the record: block edits and deletes, even for the
-- service role. A correction must be an explicit, reviewed migration.
CREATE OR REPLACE FUNCTION public.price_snapshots_immutable() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'price_snapshots rows are immutable';
END;
$$;

DROP TRIGGER IF EXISTS price_snapshots_no_change ON public.price_snapshots;
CREATE TRIGGER price_snapshots_no_change
  BEFORE UPDATE OR DELETE ON public.price_snapshots
  FOR EACH ROW EXECUTE FUNCTION public.price_snapshots_immutable();

COMMENT ON TABLE public.price_snapshots IS 'Immutable daily raw price snapshot (USD/oz, FX, source consensus). One row per UTC day.';
