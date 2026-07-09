
CREATE TABLE public.zakat_draft_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  draft_id uuid NOT NULL REFERENCES public.zakat_drafts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  step integer NOT NULL DEFAULT 0,
  snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.zakat_draft_versions TO authenticated;
GRANT ALL ON public.zakat_draft_versions TO service_role;

ALTER TABLE public.zakat_draft_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own draft versions select"
  ON public.zakat_draft_versions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX idx_zakat_draft_versions_draft_created
  ON public.zakat_draft_versions (draft_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.capture_zakat_draft_version()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  last_at timestamptz;
BEGIN
  -- Only capture when the snapshot actually changed
  IF NEW.snapshot IS DISTINCT FROM OLD.snapshot OR NEW.step IS DISTINCT FROM OLD.step THEN
    SELECT created_at INTO last_at
      FROM public.zakat_draft_versions
      WHERE draft_id = OLD.id
      ORDER BY created_at DESC
      LIMIT 1;

    -- Rate limit: at most one version per 30 seconds per draft
    IF last_at IS NULL OR (now() - last_at) > interval '30 seconds' THEN
      INSERT INTO public.zakat_draft_versions (draft_id, user_id, step, snapshot)
      VALUES (OLD.id, OLD.user_id, OLD.step, OLD.snapshot);

      -- Keep only the 20 newest versions per draft
      DELETE FROM public.zakat_draft_versions
      WHERE id IN (
        SELECT id FROM public.zakat_draft_versions
        WHERE draft_id = OLD.id
        ORDER BY created_at DESC
        OFFSET 20
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_zakat_draft_versions_capture
  BEFORE UPDATE ON public.zakat_drafts
  FOR EACH ROW EXECUTE FUNCTION public.capture_zakat_draft_version();
