-- طابور المراجعة البشرية للتقارير الزكوية — بنية جاهزة للتفعيل فور توقيع
-- أول محاسب حقيقي (الميزة معطَّلة تسويقياً "قريباً" حتى ذلك الحين، لكن
-- الجدول والسياسات جاهزة الآن كي لا يُبنى شيء من الصفر وقتها).
--
-- الفرق عن جدول clients: clients مملوك لكل مستخدم (owner_id) بعزل RLS
-- كامل بين المستخدمين — لا يراه أي محاسب آخر. هذا الجدول مقصود أن يكون
-- "صندوق وارد" مشترك: أي طلب مراجعة بشرية يظهر لكل من يحمل دور accountant
-- حتى يُطالِب (claim) به أحدهم، ثم يُقفَل على مُراجِعه فقط.

CREATE TABLE IF NOT EXISTS public.human_review_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source_client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  report_kind text NOT NULL CHECK (report_kind IN ('individual', 'company', 'institution')),
  status text NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued', 'claimed', 'in_review', 'needs_info', 'completed', 'cancelled')),
  -- نسخة ثابتة من بيانات الطلب لحظة الإرسال — لا تتأثر بتعديلات المستخدم
  -- اللاحقة على سجله الخاص، فالمُراجِع يراجع ما طُلب منه بالضبط لا الأحدث.
  payload jsonb NOT NULL,
  claimed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  claimed_at timestamptz,
  completed_at timestamptz,
  reviewer_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS human_review_queue_status_idx
  ON public.human_review_queue (status, created_at);
CREATE INDEX IF NOT EXISTS human_review_queue_requester_idx
  ON public.human_review_queue (requester_user_id);
CREATE INDEX IF NOT EXISTS human_review_queue_claimed_by_idx
  ON public.human_review_queue (claimed_by);

GRANT SELECT, INSERT ON public.human_review_queue TO authenticated;
GRANT UPDATE (status, claimed_by, claimed_at, completed_at, reviewer_notes, updated_at)
  ON public.human_review_queue TO authenticated;
GRANT ALL ON public.human_review_queue TO service_role;

ALTER TABLE public.human_review_queue ENABLE ROW LEVEL SECURITY;

-- الطالب يُنشئ طلبه الخاص فقط
DROP POLICY IF EXISTS "Requesters insert own requests" ON public.human_review_queue;
CREATE POLICY "Requesters insert own requests"
  ON public.human_review_queue FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = requester_user_id);

-- الطالب يرى حالة طلبه فقط، والمحاسب يرى كل الطابور (صندوق وارد مشترك)
DROP POLICY IF EXISTS "Requester or accountant can view" ON public.human_review_queue;
CREATE POLICY "Requester or accountant can view"
  ON public.human_review_queue FOR SELECT
  TO authenticated
  USING (
    auth.uid() = requester_user_id
    OR public.has_role(auth.uid(), 'accountant')
  );

-- التحديث (المطالبة/تغيير الحالة/الملاحظات) للمحاسبين فقط — الطالب لا
-- يُعدِّل طلبه بعد الإرسال لمنع التلاعب بما يراجعه المحاسب.
DROP POLICY IF EXISTS "Accountants update queue items" ON public.human_review_queue;
CREATE POLICY "Accountants update queue items"
  ON public.human_review_queue FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'accountant'))
  WITH CHECK (public.has_role(auth.uid(), 'accountant'));

-- الطالب يستطيع إلغاء طلبه فقط طالما لم يُطالَب به بعد
DROP POLICY IF EXISTS "Requester cancels own queued request" ON public.human_review_queue;
CREATE POLICY "Requester cancels own queued request"
  ON public.human_review_queue FOR UPDATE
  TO authenticated
  USING (auth.uid() = requester_user_id AND status = 'queued')
  WITH CHECK (auth.uid() = requester_user_id AND status = 'cancelled');
