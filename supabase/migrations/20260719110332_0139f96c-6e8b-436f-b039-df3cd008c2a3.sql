
CREATE TABLE public.user_report_archive (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL,
  year integer,
  currency text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, kind, year, currency)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_report_archive TO authenticated;
GRANT ALL ON public.user_report_archive TO service_role;

ALTER TABLE public.user_report_archive ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own archive select" ON public.user_report_archive
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own archive insert" ON public.user_report_archive
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own archive update" ON public.user_report_archive
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own archive delete" ON public.user_report_archive
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX idx_user_report_archive_user_kind
  ON public.user_report_archive (user_id, kind, year DESC);

CREATE TRIGGER trg_user_report_archive_touch
  BEFORE UPDATE ON public.user_report_archive
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
