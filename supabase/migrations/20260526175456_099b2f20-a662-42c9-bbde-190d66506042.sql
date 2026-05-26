
CREATE TABLE public.nisab_prices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  year INTEGER NOT NULL,
  month INTEGER NULL,
  hijri_year INTEGER NULL,
  country_code TEXT NOT NULL DEFAULT 'GLOBAL',
  currency TEXT NOT NULL DEFAULT 'USD',
  gold_price NUMERIC(14,4) NOT NULL,
  silver_price NUMERIC(14,4) NOT NULL,
  event TEXT NULL,
  source TEXT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (year, month, country_code)
);

CREATE INDEX idx_nisab_prices_year ON public.nisab_prices(year DESC, month DESC NULLS LAST);

GRANT SELECT ON public.nisab_prices TO anon, authenticated;
GRANT ALL ON public.nisab_prices TO service_role;

ALTER TABLE public.nisab_prices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read nisab prices"
ON public.nisab_prices FOR SELECT
TO anon, authenticated
USING (true);

-- Seed 2026 monthly data (global USD reference; placeholder values, can be updated)
INSERT INTO public.nisab_prices (year, month, hijri_year, country_code, currency, gold_price, silver_price, event)
VALUES
  (2026, 1,  1447, 'GLOBAL', 'USD',  92.50, 1.18, 'يناير 2026'),
  (2026, 2,  1447, 'GLOBAL', 'USD',  93.20, 1.20, 'فبراير 2026'),
  (2026, 3,  1447, 'GLOBAL', 'USD',  94.10, 1.22, 'مارس 2026'),
  (2026, 4,  1447, 'GLOBAL', 'USD',  94.80, 1.23, 'أبريل 2026'),
  (2026, 5,  1447, 'GLOBAL', 'USD',  95.50, 1.25, 'مايو 2026'),
  (2026, 6,  1447, 'GLOBAL', 'USD',  96.10, 1.26, 'يونيو 2026'),
  (2026, 7,  1448, 'GLOBAL', 'USD',  96.70, 1.27, 'يوليو 2026'),
  (2026, 8,  1448, 'GLOBAL', 'USD',  97.20, 1.28, 'أغسطس 2026'),
  (2026, 9,  1448, 'GLOBAL', 'USD',  97.80, 1.30, 'سبتمبر 2026'),
  (2026, 10, 1448, 'GLOBAL', 'USD',  98.40, 1.31, 'أكتوبر 2026'),
  (2026, 11, 1448, 'GLOBAL', 'USD',  99.00, 1.32, 'نوفمبر 2026'),
  (2026, 12, 1448, 'GLOBAL', 'USD',  99.60, 1.33, 'ديسمبر 2026');

-- Seed annual averages for recent years
INSERT INTO public.nisab_prices (year, month, hijri_year, country_code, currency, gold_price, silver_price, event)
VALUES
  (2025, NULL, 1447, 'GLOBAL', 'USD', 88.50, 1.10, 'متوسط 2025'),
  (2024, NULL, 1446, 'GLOBAL', 'USD', 75.20, 0.95, 'متوسط 2024'),
  (2023, NULL, 1445, 'GLOBAL', 'USD', 62.40, 0.78, 'متوسط 2023'),
  (2022, NULL, 1444, 'GLOBAL', 'USD', 58.10, 0.72, 'متوسط 2022'),
  (2021, NULL, 1443, 'GLOBAL', 'USD', 57.30, 0.81, 'متوسط 2021'),
  (2020, NULL, 1442, 'GLOBAL', 'USD', 56.80, 0.66, 'متوسط 2020 — جائحة كوفيد');
