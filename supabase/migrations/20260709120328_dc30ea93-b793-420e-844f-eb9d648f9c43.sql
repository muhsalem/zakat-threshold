CREATE TABLE public.zakat_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT 'مسودة بدون عنوان',
  wizard_kind text NOT NULL DEFAULT 'individual',
  step integer NOT NULL DEFAULT 0,
  snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.zakat_drafts TO authenticated;
GRANT ALL ON public.zakat_drafts TO service_role;

ALTER TABLE public.zakat_drafts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own drafts select" ON public.zakat_drafts FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own drafts insert" ON public.zakat_drafts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own drafts update" ON public.zakat_drafts FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own drafts delete" ON public.zakat_drafts FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX idx_zakat_drafts_user_updated ON public.zakat_drafts (user_id, updated_at DESC);

CREATE TRIGGER trg_zakat_drafts_touch
  BEFORE UPDATE ON public.zakat_drafts
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();