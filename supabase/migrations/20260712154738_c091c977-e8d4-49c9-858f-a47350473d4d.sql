DROP POLICY IF EXISTS "attachment_audit_insert" ON public.attachment_audit_log;
CREATE POLICY "attachment_audit_insert"
  ON public.attachment_audit_log FOR INSERT
  TO authenticated
  WITH CHECK (false);

REVOKE ALL ON FUNCTION public.log_attachment_change() FROM PUBLIC, anon, authenticated;