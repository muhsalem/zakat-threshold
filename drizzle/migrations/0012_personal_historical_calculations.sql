CREATE TABLE public.personal_zakat_calculations (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id uuid NOT NULL,
 history_id uuid NOT NULL REFERENCES public.nisab_history(id),
 valuation_day date NOT NULL,
 country text NOT NULL,
 currency text NOT NULL,
 metal text NOT NULL CHECK (metal IN ('gold','silver')),
 weight_grams numeric NOT NULL CHECK (weight_grams > 0),
 price_gram numeric NOT NULL CHECK (price_gram > 0),
 nisab_threshold numeric NOT NULL CHECK (nisab_threshold > 0),
 net_wealth numeric NOT NULL CHECK (net_wealth >= 0),
 year_basis text NOT NULL CHECK (year_basis IN ('hijri','gregorian')),
 zakat_rate numeric NOT NULL CHECK (zakat_rate IN (0.025,0.02577)),
 zakat_due numeric NOT NULL CHECK (zakat_due >= 0),
 price_source text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.personal_zakat_calculations TO authenticated;
GRANT ALL ON public.personal_zakat_calculations TO service_role;
ALTER TABLE public.personal_zakat_calculations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "calculations owner read" ON public.personal_zakat_calculations FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()));
CREATE POLICY "calculations owner insert" ON public.personal_zakat_calculations FOR INSERT TO authenticated WITH CHECK (user_id = (SELECT auth.uid()));
CREATE INDEX personal_calculations_owner_day ON public.personal_zakat_calculations(user_id, valuation_day DESC);