
CREATE TABLE public.nisab_daily_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  price_date DATE NOT NULL,
  country_code TEXT NOT NULL,
  currency TEXT NOT NULL,
  gold_price_per_gram NUMERIC NOT NULL,
  silver_price_per_gram NUMERIC NOT NULL,
  gold_nisab_value NUMERIC NOT NULL,
  silver_nisab_value NUMERIC NOT NULL,
  fx_rate_usd NUMERIC NOT NULL DEFAULT 1,
  source TEXT NOT NULL DEFAULT 'auto-snapshot',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (price_date, country_code)
);

GRANT SELECT ON public.nisab_daily_history TO anon;
GRANT SELECT ON public.nisab_daily_history TO authenticated;
GRANT ALL ON public.nisab_daily_history TO service_role;

ALTER TABLE public.nisab_daily_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Nisab history is public read"
  ON public.nisab_daily_history FOR SELECT
  USING (true);

CREATE INDEX idx_nisab_daily_country_date ON public.nisab_daily_history (country_code, price_date DESC);
CREATE INDEX idx_nisab_daily_date ON public.nisab_daily_history (price_date DESC);

CREATE TRIGGER trg_nisab_daily_updated_at
  BEFORE UPDATE ON public.nisab_daily_history
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
