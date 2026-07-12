-- 1) توسيع جدول المرفقات
ALTER TABLE public.approval_attachments
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS review_note text,
  ADD COLUMN IF NOT EXISTS reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE public.approval_attachments
  DROP CONSTRAINT IF EXISTS approval_attachments_status_check;
ALTER TABLE public.approval_attachments
  ADD CONSTRAINT approval_attachments_status_check
  CHECK (status IN ('draft','pending','approved','rejected'));

CREATE INDEX IF NOT EXISTS approval_attachments_status_idx
  ON public.approval_attachments (status);

DROP TRIGGER IF EXISTS trg_approval_attachments_touch ON public.approval_attachments;
CREATE TRIGGER trg_approval_attachments_touch
  BEFORE UPDATE ON public.approval_attachments
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 2) جدول سجل تدقيق المرفقات
CREATE TABLE IF NOT EXISTS public.attachment_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  attachment_id uuid NOT NULL,
  zakat_record_id uuid,
  organization_id uuid,
  actor_id uuid,
  action text NOT NULL CHECK (action IN ('created','updated','deleted','status_changed')),
  status_before text,
  status_after text,
  changed_fields text[],
  before_state jsonb,
  after_state jsonb,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS attachment_audit_attachment_idx
  ON public.attachment_audit_log (attachment_id, created_at DESC);
CREATE INDEX IF NOT EXISTS attachment_audit_org_idx
  ON public.attachment_audit_log (organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS attachment_audit_record_idx
  ON public.attachment_audit_log (zakat_record_id, created_at DESC);

GRANT SELECT, INSERT ON public.attachment_audit_log TO authenticated;
GRANT ALL ON public.attachment_audit_log TO service_role;

ALTER TABLE public.attachment_audit_log ENABLE ROW LEVEL SECURITY;

-- عرض: من قام بالإجراء، أو صاحب الإقرار، أو عضو المؤسسة (owner/admin/checker)
CREATE POLICY "attachment_audit_select"
  ON public.attachment_audit_log FOR SELECT
  TO authenticated
  USING (
    actor_id = auth.uid()
    OR (zakat_record_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.zakat_records r
       WHERE r.id = attachment_audit_log.zakat_record_id
         AND r.user_id = auth.uid()
    ))
    OR (organization_id IS NOT NULL AND private.has_org_role(
      organization_id, auth.uid(),
      ARRAY['owner'::org_role,'admin'::org_role,'checker'::org_role]
    ))
  );

-- إدراج مسموح للجميع الموثّقين (سيتم عبر trigger فقط)
CREATE POLICY "attachment_audit_insert"
  ON public.attachment_audit_log FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- 3) دالة ومشغّل التدقيق
CREATE OR REPLACE FUNCTION public.log_attachment_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_action text;
  v_changed text[] := ARRAY[]::text[];
  v_status_before text;
  v_status_after text;
  v_before jsonb;
  v_after jsonb;
  v_attachment_id uuid;
  v_record_id uuid;
  v_org_id uuid;
  v_note text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_action := 'created';
    v_status_after := NEW.status;
    v_after := to_jsonb(NEW);
    v_attachment_id := NEW.id;
    v_record_id := NEW.zakat_record_id;
    v_org_id := NEW.organization_id;
  ELSIF TG_OP = 'UPDATE' THEN
    v_status_before := OLD.status;
    v_status_after := NEW.status;
    v_before := to_jsonb(OLD);
    v_after := to_jsonb(NEW);
    v_attachment_id := NEW.id;
    v_record_id := NEW.zakat_record_id;
    v_org_id := NEW.organization_id;
    v_note := NEW.review_note;

    IF NEW.status IS DISTINCT FROM OLD.status THEN
      v_action := 'status_changed';
    ELSE
      v_action := 'updated';
    END IF;

    IF NEW.file_name IS DISTINCT FROM OLD.file_name THEN v_changed := v_changed || 'file_name'; END IF;
    IF NEW.category IS DISTINCT FROM OLD.category THEN v_changed := v_changed || 'category'; END IF;
    IF NEW.label IS DISTINCT FROM OLD.label THEN v_changed := v_changed || 'label'; END IF;
    IF NEW.status IS DISTINCT FROM OLD.status THEN v_changed := v_changed || 'status'; END IF;
    IF NEW.review_note IS DISTINCT FROM OLD.review_note THEN v_changed := v_changed || 'review_note'; END IF;

    -- تجاهل التحديثات التي غيّرت updated_at فقط
    IF array_length(v_changed, 1) IS NULL THEN
      RETURN NEW;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    v_action := 'deleted';
    v_status_before := OLD.status;
    v_before := to_jsonb(OLD);
    v_attachment_id := OLD.id;
    v_record_id := OLD.zakat_record_id;
    v_org_id := OLD.organization_id;
  END IF;

  INSERT INTO public.attachment_audit_log (
    attachment_id, zakat_record_id, organization_id, actor_id,
    action, status_before, status_after, changed_fields,
    before_state, after_state, note
  ) VALUES (
    v_attachment_id, v_record_id, v_org_id, auth.uid(),
    v_action, v_status_before, v_status_after, NULLIF(v_changed, ARRAY[]::text[]),
    v_before, v_after, v_note
  );

  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_attachment_audit ON public.approval_attachments;
CREATE TRIGGER trg_attachment_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.approval_attachments
  FOR EACH ROW EXECUTE FUNCTION public.log_attachment_change();