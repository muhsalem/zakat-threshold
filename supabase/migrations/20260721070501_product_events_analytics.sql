-- تحليلات منتج خفيفة الوزن من الطرف الأول (بلا أداة SaaS خارجية) — تسدّ فجوة
-- تدقيق سابقة: «لا تحليلات منتج ولا North Star Metric». تسجّل فقط أحداث
-- القمع الوظيفية (لا محتوى مالي حساس) لقياس رحلة المستخدم.

CREATE TABLE public.product_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  event_name text NOT NULL,
  -- session_id للزوّار غير المسجَّلين (معرّف عشوائي من المتصفح، لا يُربط بهوية)
  session_id text,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  -- سياق غير حساس فقط: المسار، نوع الحاسبة، صيغة التصدير... لا مبالغ ولا بيانات شخصية
  properties jsonb NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT product_events_name_check CHECK (char_length(event_name) BETWEEN 1 AND 100)
);

CREATE INDEX idx_product_events_name_time ON public.product_events (event_name, created_at DESC);
CREATE INDEX idx_product_events_user ON public.product_events (user_id, created_at DESC) WHERE user_id IS NOT NULL;

GRANT INSERT ON public.product_events TO authenticated, anon;
GRANT SELECT ON public.product_events TO authenticated;
GRANT ALL ON public.product_events TO service_role;

ALTER TABLE public.product_events ENABLE ROW LEVEL SECURITY;

-- الإدخال مفتوح (تسجيل حدث فقط، لا قراءة) لأي زائر — القراءة محصورة بالمحاسبين والإداريين
CREATE POLICY "Anyone can log a product event"
  ON public.product_events
  FOR INSERT
  TO authenticated, anon
  WITH CHECK (true);

CREATE POLICY "Accountants and admins can read product events"
  ON public.product_events
  FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'accountant') OR
    public.has_role(auth.uid(), 'admin')
  );
