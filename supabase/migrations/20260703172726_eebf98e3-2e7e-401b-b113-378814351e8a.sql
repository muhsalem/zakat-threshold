
CREATE POLICY "accountants read all zakat records"
  ON public.zakat_records FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'accountant'));

CREATE POLICY "accountants read all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'accountant'));
