ALTER POLICY "subs read" ON public.price_submissions TO authenticated USING ((user_id = (SELECT auth.uid())) OR public.has_role((SELECT auth.uid()), 'admin'::public.app_role));
ALTER TABLE public.price_submissions ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE ON public.price_submissions TO authenticated;
GRANT ALL ON public.price_submissions TO service_role;
REVOKE ALL ON public.price_submissions FROM anon;