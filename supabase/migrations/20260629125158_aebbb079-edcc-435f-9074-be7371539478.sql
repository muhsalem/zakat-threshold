
-- 1) تشديد سياسات nisab_records: قصر الكتابة/التحديث/الحذف على المدراء فقط
DROP POLICY IF EXISTS "Authenticated insert nisab_records" ON public.nisab_records;
DROP POLICY IF EXISTS "Authenticated update nisab_records" ON public.nisab_records;
DROP POLICY IF EXISTS "Authenticated delete nisab_records" ON public.nisab_records;

CREATE POLICY "Admins can insert nisab_records"
  ON public.nisab_records FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update nisab_records"
  ON public.nisab_records FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete nisab_records"
  ON public.nisab_records FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 2) حصر تنفيذ دوال التحقق من الأدوار على authenticated فقط (لا public/anon)
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.has_org_role(uuid, uuid, org_role[]) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_org_member(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.generate_hawl_reminders() FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_org_role(uuid, uuid, org_role[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_org_member(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_hawl_reminders() TO service_role;

-- 3) جدول شهادات شرعية مطبوعة مع بصمة قابلة للتحقق
CREATE TABLE IF NOT EXISTS public.sharia_attestations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  zakat_record_id uuid REFERENCES public.zakat_records(id) ON DELETE SET NULL,
  title text NOT NULL,
  attestor_name text NOT NULL,
  attestor_license text,
  opinion text NOT NULL,
  sharia_refs text[] NOT NULL DEFAULT '{}',
  content_hash text NOT NULL,
  issued_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.sharia_attestations TO authenticated;
GRANT ALL ON public.sharia_attestations TO service_role;

ALTER TABLE public.sharia_attestations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own attestations"
  ON public.sharia_attestations FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'));

CREATE POLICY "Users insert own attestations"
  ON public.sharia_attestations FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS sharia_attestations_user_idx ON public.sharia_attestations(user_id, issued_at DESC);
CREATE INDEX IF NOT EXISTS sharia_attestations_hash_idx ON public.sharia_attestations(content_hash);
