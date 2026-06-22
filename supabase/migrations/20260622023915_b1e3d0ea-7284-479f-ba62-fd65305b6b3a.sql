
ALTER TABLE public.nisab_prices
  ADD COLUMN IF NOT EXISTS reliability text NOT NULL DEFAULT 'direct'
  CHECK (reliability IN ('direct','derived','estimated')),
  ADD COLUMN IF NOT EXISTS reliability_score smallint NOT NULL DEFAULT 5
  CHECK (reliability_score BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS gold_nisab_value numeric(18,4),
  ADD COLUMN IF NOT EXISTS silver_nisab_value numeric(18,4);

UPDATE public.nisab_prices SET
  reliability = CASE
    WHEN source IS NULL OR source = '' THEN 'direct'
    WHEN source ILIKE '%استيفاء خطي%' THEN 'estimated'
    WHEN source ILIKE '%USD تاريخي%' OR source ILIKE '%FX%' THEN 'derived'
    ELSE 'direct'
  END,
  reliability_score = CASE
    WHEN source IS NULL OR source = '' THEN 5
    WHEN source ILIKE '%استيفاء خطي%' THEN 2
    WHEN source ILIKE '%USD تاريخي%' OR source ILIKE '%FX%' THEN 3
    ELSE 5
  END,
  gold_nisab_value = ROUND(gold_price * 85, 4),
  silver_nisab_value = ROUND(silver_price * 595, 4);

CREATE INDEX IF NOT EXISTS idx_nisab_prices_reliability ON public.nisab_prices(reliability);
