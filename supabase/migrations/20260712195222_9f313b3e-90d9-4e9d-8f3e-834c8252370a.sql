DROP POLICY IF EXISTS "approval_attachments_read" ON storage.objects;

CREATE POLICY "approval_attachments_read" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'approval-attachments'
    AND EXISTS (
      SELECT 1 FROM public.approval_attachments a
      LEFT JOIN public.zakat_records r ON r.id = a.zakat_record_id
      WHERE a.storage_path = storage.objects.name
        AND (
          a.uploaded_by = auth.uid()
          OR (a.zakat_record_id IS NOT NULL AND r.user_id = auth.uid())
          OR (a.organization_id IS NOT NULL AND private.is_org_member(a.organization_id, auth.uid()))
        )
    )
  );