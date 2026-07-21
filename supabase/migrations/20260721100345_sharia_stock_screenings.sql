-- أرشيف دائم لتقارير الفرز الشرعي لأسهم الشركات المتداوَلة — يستبدل
-- window.storage (خاص ببيئة Claude Artifacts فقط) بتخزين حقيقي مع RLS.

CREATE TABLE public.sharia_stock_screenings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  company_name text,
  file_name text,
  file_hash text,
  methodology text NOT NULL DEFAULT 'aaoifi',
  score integer,
  verdict_tone text,
  -- الاستخراج الخام + الحساب الكامل + إجابات استبيان فحص العقود
  payload jsonb NOT NULL,
  CONSTRAINT sharia_stock_screenings_methodology_check
    CHECK (methodology IN ('aaoifi', 'djim', 'sp')),
  CONSTRAINT sharia_stock_screenings_verdict_tone_check
    CHECK (verdict_tone IN ('pass', 'warn', 'fail') OR verdict_tone IS NULL)
);

CREATE INDEX idx_sharia_stock_screenings_user_time
  ON public.sharia_stock_screenings (user_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.sharia_stock_screenings TO authenticated;
GRANT ALL ON public.sharia_stock_screenings TO service_role;

ALTER TABLE public.sharia_stock_screenings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Own sharia stock screenings"
  ON public.sharia_stock_screenings
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
