CREATE TABLE IF NOT EXISTS public.metal_prices_daily (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  price_date date NOT NULL,
  metal text NOT NULL CHECK (metal IN ('gold','silver')),
  price_usd_per_gram numeric(14,6) NOT NULL,
  currency text NOT NULL DEFAULT 'USD',
  source text,
  reliability text NOT NULL DEFAULT 'direct' CHECK (reliability IN ('direct','derived','estimated')),
  reliability_score smallint NOT NULL DEFAULT 5 CHECK (reliability_score BETWEEN 1 AND 5),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (price_date, metal, currency)
);
CREATE INDEX IF NOT EXISTS idx_mpd_date ON public.metal_prices_daily (price_date DESC);
CREATE INDEX IF NOT EXISTS idx_mpd_metal_date ON public.metal_prices_daily (metal, price_date DESC);

GRANT SELECT ON public.metal_prices_daily TO anon, authenticated;
GRANT ALL ON public.metal_prices_daily TO service_role;
ALTER TABLE public.metal_prices_daily ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read metal prices daily" ON public.metal_prices_daily FOR SELECT TO anon, authenticated USING (true);

CREATE TRIGGER trg_mpd_updated_at BEFORE UPDATE ON public.metal_prices_daily
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();