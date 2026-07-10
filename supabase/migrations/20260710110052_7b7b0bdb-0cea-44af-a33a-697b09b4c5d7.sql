
ALTER TABLE public.sharia_audit_log ALTER COLUMN user_id DROP NOT NULL;

DROP POLICY IF EXISTS "admins view all audit log" ON public.sharia_audit_log;
CREATE POLICY "admins view all audit log"
  ON public.sharia_audit_log
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS idx_sharia_audit_log_created_at
  ON public.sharia_audit_log (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_sharia_audit_log_action_created_at
  ON public.sharia_audit_log (action, created_at DESC);
