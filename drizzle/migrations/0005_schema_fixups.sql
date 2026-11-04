ALTER TABLE public.jeweler_feed ADD COLUMN source_url text, ADD COLUMN change_pct numeric;
ALTER TABLE public.official_sources ADD COLUMN value_pattern text;
UPDATE public.official_sources SET currency = '' WHERE currency IS NULL;
ALTER TABLE public.official_sources ALTER COLUMN currency SET DEFAULT '', ALTER COLUMN currency SET NOT NULL;
ALTER TABLE public.notification_prefs ADD COLUMN email boolean NOT NULL DEFAULT false;
UPDATE public.profiles SET display_name=coalesce(display_name,''), org=coalesce(org,''), contact=coalesce(contact,''), license=coalesce(license,'');
ALTER TABLE public.profiles ALTER COLUMN display_name SET DEFAULT '', ALTER COLUMN display_name SET NOT NULL, ALTER COLUMN org SET DEFAULT '', ALTER COLUMN org SET NOT NULL, ALTER COLUMN contact SET DEFAULT '', ALTER COLUMN contact SET NOT NULL, ALTER COLUMN license SET DEFAULT '', ALTER COLUMN license SET NOT NULL;
CREATE OR REPLACE FUNCTION public.jeweler_leaderboard(_country text)
RETURNS TABLE(user_id uuid, display_name text, org text, approved bigint, score bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT s.user_id, coalesce(p.display_name,''), coalesce(p.org,''),
    count(*) FILTER (WHERE s.status='approved'),
    coalesce(sum((SELECT coalesce(sum(v.vote),0) FROM public.price_votes v WHERE v.submission_id=s.id)),0)::bigint
  FROM public.price_submissions s LEFT JOIN public.profiles p ON p.id=s.user_id
  WHERE s.country=_country GROUP BY s.user_id,p.display_name,p.org
  ORDER BY 4 DESC, 5 DESC LIMIT 20 $$;
GRANT EXECUTE ON FUNCTION public.jeweler_leaderboard(text) TO anon, authenticated;