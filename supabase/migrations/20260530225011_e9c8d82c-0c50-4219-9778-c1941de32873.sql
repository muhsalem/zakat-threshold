
DROP POLICY IF EXISTS "Public insert nisab_records" ON public.nisab_records;
DROP POLICY IF EXISTS "Public update nisab_records" ON public.nisab_records;
DROP POLICY IF EXISTS "Public delete nisab_records" ON public.nisab_records;

CREATE POLICY "Authenticated insert nisab_records"
ON public.nisab_records FOR INSERT TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated update nisab_records"
ON public.nisab_records FOR UPDATE TO authenticated
USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated delete nisab_records"
ON public.nisab_records FOR DELETE TO authenticated
USING (true);
