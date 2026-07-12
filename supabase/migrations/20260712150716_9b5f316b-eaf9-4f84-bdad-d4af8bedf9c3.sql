
CREATE TABLE public.approval_attachments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  approval_id UUID REFERENCES public.zakat_approvals(id) ON DELETE CASCADE,
  zakat_record_id UUID REFERENCES public.zakat_records(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  uploaded_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  mime_type TEXT,
  size_bytes BIGINT,
  category TEXT NOT NULL DEFAULT 'other',
  label TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (approval_id IS NOT NULL OR zakat_record_id IS NOT NULL)
);

CREATE INDEX approval_attachments_approval_idx ON public.approval_attachments(approval_id);
CREATE INDEX approval_attachments_record_idx ON public.approval_attachments(zakat_record_id);
CREATE INDEX approval_attachments_org_idx ON public.approval_attachments(organization_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.approval_attachments TO authenticated;
GRANT ALL ON public.approval_attachments TO service_role;

ALTER TABLE public.approval_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "attachments_select" ON public.approval_attachments
  FOR SELECT TO authenticated
  USING (
    uploaded_by = auth.uid()
    OR (zakat_record_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.zakat_records r
      WHERE r.id = zakat_record_id AND r.user_id = auth.uid()
    ))
    OR (organization_id IS NOT NULL AND private.is_org_member(organization_id, auth.uid()))
  );

CREATE POLICY "attachments_insert" ON public.approval_attachments
  FOR INSERT TO authenticated
  WITH CHECK (
    uploaded_by = auth.uid()
    AND (
      (zakat_record_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.zakat_records r
        WHERE r.id = zakat_record_id AND r.user_id = auth.uid()
      ))
      OR (organization_id IS NOT NULL AND private.has_org_role(
        organization_id, auth.uid(),
        ARRAY['owner','admin','maker','checker']::public.org_role[]
      ))
    )
  );

CREATE POLICY "attachments_delete" ON public.approval_attachments
  FOR DELETE TO authenticated
  USING (
    uploaded_by = auth.uid()
    OR (organization_id IS NOT NULL AND private.has_org_role(
      organization_id, auth.uid(),
      ARRAY['owner','admin']::public.org_role[]
    ))
  );

CREATE POLICY "approval_attachments_read" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'approval-attachments'
    AND EXISTS (
      SELECT 1 FROM public.approval_attachments a
      WHERE a.storage_path = name
    )
  );

CREATE POLICY "approval_attachments_write" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'approval-attachments'
    AND owner = auth.uid()
  );

CREATE POLICY "approval_attachments_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'approval-attachments'
    AND owner = auth.uid()
  );
