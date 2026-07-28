-- =========================================================
-- 1) pdf_templates
-- =========================================================
CREATE TABLE public.pdf_templates (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  kind text NOT NULL CHECK (kind IN ('declaration','compliance','certified')),
  is_default boolean NOT NULL DEFAULT false,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_pdf_templates_user ON public.pdf_templates(user_id);
CREATE INDEX idx_pdf_templates_org ON public.pdf_templates(organization_id);
CREATE UNIQUE INDEX idx_pdf_templates_default_per_kind
  ON public.pdf_templates(user_id, kind) WHERE is_default = true;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pdf_templates TO authenticated;
GRANT ALL ON public.pdf_templates TO service_role;

ALTER TABLE public.pdf_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own_templates_select" ON public.pdf_templates
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR (organization_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = pdf_templates.organization_id
        AND om.user_id = auth.uid()
    ))
  );

CREATE POLICY "own_templates_insert" ON public.pdf_templates
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "own_templates_update" ON public.pdf_templates
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "own_templates_delete" ON public.pdf_templates
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

CREATE TRIGGER pdf_templates_touch
  BEFORE UPDATE ON public.pdf_templates
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- =========================================================
-- 2) pdf_reports
-- =========================================================
CREATE SEQUENCE IF NOT EXISTS public.pdf_report_seq;

CREATE OR REPLACE FUNCTION public.next_pdf_report_uid()
RETURNS text
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  n bigint;
BEGIN
  n := nextval('public.pdf_report_seq');
  RETURN 'RPT-' || to_char(now(), 'YYYY') || '-' || lpad(n::text, 6, '0');
END;
$$;

CREATE TABLE public.pdf_reports (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  report_uid text NOT NULL UNIQUE DEFAULT public.next_pdf_report_uid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL,
  zakat_record_id uuid REFERENCES public.zakat_records(id) ON DELETE SET NULL,
  template_id uuid REFERENCES public.pdf_templates(id) ON DELETE SET NULL,
  kind text NOT NULL CHECK (kind IN ('declaration','compliance','certified')),
  title text NOT NULL,
  content_hash text NOT NULL,
  snapshot jsonb NOT NULL,
  status text NOT NULL DEFAULT 'generated'
    CHECK (status IN ('generated','downloaded','sent','approved','canceled')),
  version integer NOT NULL DEFAULT 1,
  storage_path text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  last_downloaded_at timestamptz,
  last_downloaded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  signature_meta jsonb
);

CREATE INDEX idx_pdf_reports_user ON public.pdf_reports(user_id, created_at DESC);
CREATE INDEX idx_pdf_reports_record ON public.pdf_reports(zakat_record_id);
CREATE INDEX idx_pdf_reports_org ON public.pdf_reports(organization_id);
CREATE INDEX idx_pdf_reports_status ON public.pdf_reports(status);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pdf_reports TO authenticated;
GRANT ALL ON public.pdf_reports TO service_role;

ALTER TABLE public.pdf_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reports_select" ON public.pdf_reports
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR (organization_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = pdf_reports.organization_id
        AND om.user_id = auth.uid()
    ))
  );

CREATE POLICY "reports_insert" ON public.pdf_reports
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR created_by = auth.uid());

CREATE POLICY "reports_update" ON public.pdf_reports
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "reports_delete" ON public.pdf_reports
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

CREATE TRIGGER pdf_reports_touch
  BEFORE UPDATE ON public.pdf_reports
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- =========================================================
-- 3) pdf_report_audit
-- =========================================================
CREATE TABLE public.pdf_report_audit (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  report_id uuid NOT NULL REFERENCES public.pdf_reports(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL CHECK (action IN
    ('created','downloaded','viewed','sent','approved','canceled','regenerated','template_updated','status_changed')),
  ip text,
  user_agent text,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_pdf_report_audit_report ON public.pdf_report_audit(report_id, created_at DESC);

GRANT SELECT, INSERT ON public.pdf_report_audit TO authenticated;
GRANT ALL ON public.pdf_report_audit TO service_role;

ALTER TABLE public.pdf_report_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "audit_select" ON public.pdf_report_audit
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.pdf_reports r
    WHERE r.id = pdf_report_audit.report_id
      AND (r.user_id = auth.uid()
        OR (r.organization_id IS NOT NULL AND EXISTS (
          SELECT 1 FROM public.organization_members om
          WHERE om.organization_id = r.organization_id AND om.user_id = auth.uid()
        )))
  ));

CREATE POLICY "audit_insert" ON public.pdf_report_audit
  FOR INSERT TO authenticated
  WITH CHECK (actor_id = auth.uid() OR actor_id IS NULL);

-- =========================================================
-- 4) Trigger لتسجيل التغييرات تلقائيًا
-- =========================================================
CREATE OR REPLACE FUNCTION public.log_pdf_report_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.pdf_report_audit (report_id, actor_id, action, metadata)
    VALUES (NEW.id, auth.uid(), 'created',
      jsonb_build_object('kind', NEW.kind, 'version', NEW.version, 'report_uid', NEW.report_uid));
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      INSERT INTO public.pdf_report_audit (report_id, actor_id, action, metadata)
      VALUES (NEW.id, auth.uid(), 'status_changed',
        jsonb_build_object('from', OLD.status, 'to', NEW.status));
    END IF;
    IF NEW.last_downloaded_at IS DISTINCT FROM OLD.last_downloaded_at
       AND NEW.last_downloaded_at IS NOT NULL THEN
      INSERT INTO public.pdf_report_audit (report_id, actor_id, action)
      VALUES (NEW.id, auth.uid(), 'downloaded');
    END IF;
    IF NEW.version IS DISTINCT FROM OLD.version THEN
      INSERT INTO public.pdf_report_audit (report_id, actor_id, action, metadata)
      VALUES (NEW.id, auth.uid(), 'regenerated',
        jsonb_build_object('from_version', OLD.version, 'to_version', NEW.version));
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER pdf_reports_audit_trg
  AFTER INSERT OR UPDATE ON public.pdf_reports
  FOR EACH ROW EXECUTE FUNCTION public.log_pdf_report_change();