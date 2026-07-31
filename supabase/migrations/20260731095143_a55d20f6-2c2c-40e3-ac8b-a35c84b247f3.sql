CREATE TABLE IF NOT EXISTS public.product_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_name text NOT NULL,
  session_id text,
  user_id uuid,
  properties jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS product_events_created_at_idx ON public.product_events (created_at DESC);
CREATE INDEX IF NOT EXISTS product_events_name_idx ON public.product_events (event_name);

GRANT SELECT, INSERT ON public.product_events TO authenticated;
GRANT INSERT ON public.product_events TO anon;
GRANT ALL ON public.product_events TO service_role;

ALTER TABLE public.product_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anyone can log product events" ON public.product_events;
CREATE POLICY "anyone can log product events"
  ON public.product_events FOR INSERT TO anon, authenticated
  WITH CHECK (user_id IS NULL OR user_id = auth.uid());

DROP POLICY IF EXISTS "admins can read product events" ON public.product_events;
CREATE POLICY "admins can read product events"
  ON public.product_events FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'));