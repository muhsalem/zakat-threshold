CREATE TABLE public.nisab_records (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_label text NOT NULL,
  unified_nisab_date date NOT NULL,
  hijri_label text,
  calendar_basis text NOT NULL DEFAULT 'hijri',
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.nisab_records TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.nisab_records TO authenticated;
GRANT ALL ON public.nisab_records TO service_role;

ALTER TABLE public.nisab_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read nisab_records" ON public.nisab_records FOR SELECT USING (true);
CREATE POLICY "Public insert nisab_records" ON public.nisab_records FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update nisab_records" ON public.nisab_records FOR UPDATE USING (true);
CREATE POLICY "Public delete nisab_records" ON public.nisab_records FOR DELETE USING (true);

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER tg_nisab_records_updated
BEFORE UPDATE ON public.nisab_records
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();