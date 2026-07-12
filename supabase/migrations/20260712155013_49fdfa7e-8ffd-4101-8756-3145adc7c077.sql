CREATE TABLE public.attachment_download_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  attachment_id uuid NOT NULL REFERENCES public.approval_attachments(id) ON DELETE CASCADE,
  downloaded_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  downloaded_at timestamptz NOT NULL DEFAULT now(),
  ip text,
  user_agent text
);
CREATE INDEX attachment_download_log_attachment_idx ON public.attachment_download_log(attachment_id);
CREATE INDEX attachment_download_log_user_idx ON public.attachment_download_log(downloaded_by);

GRANT SELECT, INSERT ON public.attachment_download_log TO authenticated;
GRANT ALL ON public.attachment_download_log TO service_role;

ALTER TABLE public.attachment_download_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "download_log_insert" ON public.attachment_download_log
  FOR INSERT TO authenticated
  WITH CHECK (
    downloaded_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.approval_attachments a
      WHERE a.id = attachment_download_log.attachment_id
        AND (
          a.uploaded_by = auth.uid()
          OR (a.zakat_record_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM public.zakat_records r
            WHERE r.id = a.zakat_record_id AND r.user_id = auth.uid()
          ))
          OR (a.organization_id IS NOT NULL AND private.is_org_member(a.organization_id, auth.uid()))
        )
    )
  );

CREATE POLICY "download_log_select" ON public.attachment_download_log
  FOR SELECT TO authenticated
  USING (
    downloaded_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.approval_attachments a
      WHERE a.id = attachment_download_log.attachment_id
        AND (
          a.uploaded_by = auth.uid()
          OR (a.organization_id IS NOT NULL
              AND private.has_org_role(a.organization_id, auth.uid(), ARRAY['owner'::org_role, 'admin'::org_role]))
        )
    )
  );