
CREATE POLICY "admins read all profiles" ON public.profiles
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admins read all zakat records" ON public.zakat_records
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
