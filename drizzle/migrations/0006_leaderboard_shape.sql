DROP FUNCTION public.jeweler_leaderboard(text);
CREATE FUNCTION public.jeweler_leaderboard(_country text)
RETURNS TABLE(user_id uuid, display_name text, org text, country text, approved bigint, accuracy numeric, points bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT s.user_id, coalesce(p.display_name,''), coalesce(p.org,''), _country,
    count(*) FILTER (WHERE s.status='approved'),
    CASE WHEN count(*) FILTER (WHERE s.status<>'pending') = 0 THEN NULL
      ELSE round(100.0 * count(*) FILTER (WHERE s.status='approved') / count(*) FILTER (WHERE s.status<>'pending'),1) END,
    (count(*) FILTER (WHERE s.status='approved') * 10 + coalesce((SELECT sum(v.vote) FROM public.price_votes v JOIN public.price_submissions s2 ON s2.id=v.submission_id WHERE s2.user_id=s.user_id AND s2.country=_country),0))::bigint
  FROM public.price_submissions s LEFT JOIN public.profiles p ON p.id=s.user_id
  WHERE s.country=_country GROUP BY s.user_id,p.display_name,p.org
  ORDER BY 7 DESC LIMIT 20 $$;
GRANT EXECUTE ON FUNCTION public.jeweler_leaderboard(text) TO anon, authenticated;