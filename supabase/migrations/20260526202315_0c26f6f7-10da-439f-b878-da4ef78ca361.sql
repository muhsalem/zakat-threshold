
-- Profiles
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  display_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "view own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- Zakat records (historical ledger)
CREATE TABLE public.zakat_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  record_type TEXT NOT NULL DEFAULT 'individual',
  hijri_year TEXT,
  gregorian_date DATE NOT NULL DEFAULT CURRENT_DATE,
  currency TEXT NOT NULL DEFAULT 'SAR',
  total_assets NUMERIC(18,2) NOT NULL DEFAULT 0,
  total_liabilities NUMERIC(18,2) NOT NULL DEFAULT 0,
  zakat_base NUMERIC(18,2) NOT NULL DEFAULT 0,
  zakat_due NUMERIC(18,2) NOT NULL DEFAULT 0,
  prepaid_zakat NUMERIC(18,2) NOT NULL DEFAULT 0,
  net_due NUMERIC(18,2) NOT NULL DEFAULT 0,
  notes TEXT,
  snapshot JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_zakat_records_user ON public.zakat_records(user_id, gregorian_date DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.zakat_records TO authenticated;
GRANT ALL ON public.zakat_records TO service_role;
ALTER TABLE public.zakat_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "view own records" ON public.zakat_records FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert own records" ON public.zakat_records FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update own records" ON public.zakat_records FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "delete own records" ON public.zakat_records FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_zakat_records_updated BEFORE UPDATE ON public.zakat_records
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
