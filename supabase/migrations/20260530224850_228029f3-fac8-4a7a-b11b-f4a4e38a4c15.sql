
CREATE TABLE public.sharia_audit_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  zakat_record_id UUID REFERENCES public.zakat_records(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  fingerprint TEXT,
  payload JSONB,
  sharia_refs TEXT[],
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.sharia_audit_log TO authenticated;
GRANT ALL ON public.sharia_audit_log TO service_role;

ALTER TABLE public.sharia_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "view own audit log"
ON public.sharia_audit_log FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "insert own audit log"
ON public.sharia_audit_log FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_sharia_audit_user ON public.sharia_audit_log(user_id, created_at DESC);
